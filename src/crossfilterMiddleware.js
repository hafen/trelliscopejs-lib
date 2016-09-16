
// even though it isn't a good thing to do in redux, we want
// crossfilter to remain mutable so we will use a custom
// middleware to mutate the crossfilter dimensions whenever
// SET_SORT or SET_FILTER operations are performed

const getNumVal = (d, name) => (isNaN(d[name]) ? null : d[name]);
const getCatVal = (d, name) => d[name]; // TODO: what about NaN?


const sortFn = (property) => {
  let sortOrder = 1;
  let property2 = property;
  if (property[0] === '!') {
    sortOrder = -1;
    property2 = property2.substr(1);
  }
  return (a, b) => {
    const result = (a[property2] < b[property2]) ? -1 : (a[property2] > b[property2]) ? 1 : 0;
    return result * sortOrder;
  };
};

const multiSort = (args) => {
  const props = args;
  return (obj1, obj2) => {
    let i = 0;
    let result = 0;
    while (result === 0 && i < props.length) {
      result = sortFn(props[i])(obj1, obj2);
      i += 1;
    }
    return result;
  };
};

const crossfilterMiddleware = store => next => action => {
  if (action.type === 'SET_FILTER' && action.sort) {
    const cf = store.getState()._cogDataMutable.crossfilter;
    const dimensions = store.getState()._cogDataMutable.dimensionRefs;
    const groups = store.getState()._cogDataMutable.groupRefs;

    if (typeof action.filter === 'string' || action.filter instanceof String) {
      dimensions[action.filter].filter(null); // .remove(), .filterAll() ?
    } else {
      const names = Object.keys(action.filter);
      for (let i = 0; i < names.length; i += 1) {
        // numeric is always 'range' type
        if (action.filter[names[i]].varType === 'numeric') {
          if (dimensions[names[i]] === undefined) {
            dimensions[names[i]] = cf.dimension(d => getNumVal(d, names[i]));
          }
          if (groups[names[i]] === undefined) {
            // group.dispose(); // to get rid of previous group
            // create group that bins into histogram breaks
            const ci = store.getState()._displayInfo.info.cogInfo[names[i]];
            groups[names[i]] = dimensions[names[i]].group(d =>
              (isNaN(d) ? null : ci.breaks[Math.floor((d - ci.breaks[0]) / ci.delta)]));
          }
          if (action.filter[names[i]].value === undefined) {
            dimensions[names[i]].filter(null); // .filterAll()
          } else {
            let fromVal = action.filter[names[i]].value.from;
            let toVal = action.filter[names[i]].value.to;
            fromVal = fromVal === undefined ? -Infinity : fromVal;
            toVal = toVal === undefined ? Infinity : toVal;
            dimensions[names[i]].filter([fromVal, toVal]);
          }
        } else if (action.filter[names[i]].varType === 'factor') {
          if (dimensions[names[i]] === undefined) {
            dimensions[names[i]] = cf.dimension(d => getCatVal(d, names[i]));
          }
          if (groups[names[i]] === undefined) {
            // group.dispose(); // to get rid of previous group
            groups[names[i]] = dimensions[names[i]].group();
          }
          if (action.filter[names[i]].value === undefined) {
            dimensions[names[i]].filter(null); // .filterAll()
          } else {
            // handle select and regex (regex same as select as value is already populated)
            const selectVals = action.filter[names[i]].value;
            dimensions[names[i]].filter(d => selectVals.indexOf(d) > -1);
          }
        }
      }
    }
    // const size = store.getState()._cogDataMutable.allRef.value();
    // console.log(`Filtered... size is now ${size}`);
  } else if (action.type === 'SET_FILTER_VIEW') {
    // need to make sure any filter in view has a dimension and group
    // so we can create bar charts / histograms
    // also if the filter is hidden and inactive, we should remove the dimension
    // .remove() ?
    if (action.which === 'add') {
      const cf = store.getState()._cogDataMutable.crossfilter;
      const dimensions = store.getState()._cogDataMutable.dimensionRefs;
      const groups = store.getState()._cogDataMutable.groupRefs;

      const type = store.getState()._displayInfo.info.cogInfo[action.name].type;

      if (dimensions[action.name] === undefined) {
        if (type === 'numeric') {
          dimensions[action.name] = cf.dimension(d => getNumVal(d, action.name));
        } else {
          dimensions[action.name] = cf.dimension(d => getCatVal(d, action.name));
        }
      }

      if (groups[action.name] === undefined) {
        if (type === 'numeric') {
          const ci = store.getState()._displayInfo.info.cogInfo[action.name];
          groups[action.name] = dimensions[action.name].group(d =>
            (isNaN(d) ? null : ci.breaks[Math.floor((d - ci.breaks[0]) / ci.delta)]));
        } else {
          groups[action.name] = dimensions[action.name].group();
        }
      }
    }
  } else if (action.type === 'SET_SORT' && action.sort) {
    // if only sorting on one variable, make a sort dimension according to that variable
    // if more than one variable, crossfilter can only handle sorting on one dimension
    // so we have to get sort index of entire data set and create a new dimension
    // that uses this information
    // this isn't efficient but sorting is expected to happen at much lower frequency
    // than filtering and the user can tolerate more latency with sorting than filtering

    const cf = store.getState()._cogDataMutable.crossfilter;
    const dimensions = store.getState()._cogDataMutable.dimensionRefs;
    if (dimensions) {
      if (dimensions.__sort) {
        dimensions.__sort.remove();
      }
      let newState = action.sort;
      if (typeof action.sort === 'number') {
        newState = Object.assign([], [], store.getState().sort);
        newState.splice(action.sort, 1);
      }
      if (newState.length === 0) {
        dimensions.__sort = cf.dimension(d => d.__index);
      } else if (newState.length === 1) {
        dimensions.__sort = cf.dimension(d => d[newState[0].name]);
      } else {
        const dat = cf.all();
        const sortDat = [];
        for (let i = 0; i < dat.length; i += 1) {
          const elem = { __index: dat[i].__index };
          for (let j = 0; j < newState.length; j += 1) {
            elem[newState[j].name] = dat[i][newState[j].name];
          }
          sortDat.push(elem);
        }
        const sortSpec = [];
        for (let i = 0; i < newState.length; i += 1) {
          sortSpec.push(`${newState[i].dir === 'asc' ? '' : '!'}${newState[i].name}`);
        }
        sortDat.sort(multiSort(sortSpec));
        const idx = {};
        for (let i = 0; i < sortDat.length; i += 1) {
          idx[sortDat[i].__index] = i;
        }
        dimensions.__sort = cf.dimension(d => idx[d.__index]);
      }
    }
  }
  return next(action);
};

export default crossfilterMiddleware;
