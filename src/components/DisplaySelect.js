import React from 'react';
import injectSheet from 'react-jss';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { createSelector } from 'reselect';
import Mousetrap from 'mousetrap';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import { emphasize } from 'material-ui/utils/colorManipulator';
import DisplayList from './DisplayList';
import { setSelectedDisplay, fetchDisplay, setPanelRenderer, setActiveSidebar,
  setLabels, setLayout, setSort, setFilter, setFilterView } from '../actions';
import { displayGroupsSelector } from '../selectors/display';
import { configSelector, displayListSelector,
  selectedDisplaySelector } from '../selectors';
import uiConsts from '../styles/uiConsts';

class DisplaySelect extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: props.selectedDisplay.name === '',
      btnScale: 1
    };
  }
  componentWillMount() {
    if (this.props.selectedDisplay.name === '') {
      this.props.setDialogOpen(true);
    }
  }
  componentDidMount() {
    Mousetrap.bind(['o'], this.handleKey);

    const attnInterval = setInterval(() => {
      const elem = this._atnnCircle;
      if (this.props.selectedDisplay.name !== '') {
        clearInterval(attnInterval);
      }
      if (elem) {
        elem.style.transform = `scale(${this.state.btnScale})`;
        this.setState({ btnScale: this.state.btnScale === 1 ? 0.85 : 1 });
      }
    }, 750);
  }
  componentWillUnmount() {
    Mousetrap.unbind(['o']);
  }
  handleOpen = () => {
    if (this.props.displayList && this.props.displayList.isLoaded) {
      this.props.setDialogOpen(true);
      this.setState({ open: true });
    }
  }
  handleKey = () => {
    this.props.setDialogOpen(true);
    this.setState({ open: true });
  }
  handleClose = () => {
    this.props.setDialogOpen(false);
    this.setState({ open: false });
  }
  handleSelect = (name, group, desc) => {
    this.props.handleClick(name, group, desc, this.props.cfg);
    this.props.setDialogOpen(false);
    this.setState({ open: false });
  }
  render() {
    const { classes } = this.props.sheet;

    const actions = [
      <FlatButton
        label="Close"
        secondary
        onTouchTap={this.handleClose}
      />
    ];
    const isLoaded = this.props.displayList && this.props.displayList.isLoaded;
    let attnDiv = (
      <div className={classes.attnOuter}>
        <div className={classes.attnInner}>
          <div
            ref={(d) => { this._atnnCircle = d; }}
            className={classes.attnEmpty}
          />
        </div>
      </div>
    );
    if (this.props.selectedDisplay.name !== '' || this.state.open) {
      attnDiv = '';
    }

    return (
      <button
        onClick={this.handleOpen}
        className={classNames({ [classes.button]: true, [classes.buttonInactive]: !isLoaded })}
      >
        {attnDiv}
        <i className={`icon-folder-open ${classes.folderIcon}`} />
        <Dialog
          title="Select a Display to Open"
          actions={actions}
          modal={false}
          open={this.state.open}
          onRequestClose={this.handleClose}
        >
          <DisplayList
            di={this.props.displayList.list}
            displayGroups={this.props.displayGroups}
            handleClick={this.handleSelect}
            cfg={this.props.cfg}
          />
        </Dialog>
      </button>
    );
  }
}

DisplaySelect.propTypes = {
  sheet: React.PropTypes.object,
  handleClick: React.PropTypes.func,
  setDialogOpen: React.PropTypes.func,
  cfg: React.PropTypes.object,
  selectedDisplay: React.PropTypes.object,
  displayList: React.PropTypes.object,
  displayGroups: React.PropTypes.object
};

// ------ static styles ------

const staticStyles = {
  attnOuter: {
    position: 'absolute',
    overflow: 'hidden',
    height: uiConsts.header.height,
    width: uiConsts.header.height,
    top: 0,
    left: (uiConsts.sideButtons.width - uiConsts.header.height) / 2,
    pointerEvents: 'none'
  },
  attnInner: {
    position: 'absolute',
    height: uiConsts.header.height,
    width: uiConsts.header.height,
    top: 0,
    left: 0,
    transition: ['transform 450ms cubic-bezier(0.23, 1, 0.32, 1)',
      '0ms opacity 450ms cubic-bezier(0.23, 1, 0.32, 1) 0ms'].join(' '),
    opacity: 1,
    transform: 'scale(0.85)'
  },
  attnEmpty: {
    position: 'absolute',
    height: uiConsts.header.height,
    width: '100%',
    borderRadius: '50%',
    opacity: 0.16,
    transition: 'transform 750ms cubic-bezier(0.445, 0.05, 0.55, 0.95) 0ms',
    top: 0,
    transform: 'scale(0.85)',
    backgroundColor: 'rgba(0, 0, 0, 0.870588)'
  },
  folderIcon: {
    paddingLeft: 3
  },
  button: {
    zIndex: 500,
    position: 'fixed',
    boxSizing: 'border-box',
    top: 0,
    left: 0,
    height: uiConsts.header.height,
    width: uiConsts.sideButtons.width,
    fontSize: 18,
    lineHeight: `${uiConsts.header.height + 2}px`,
    background: uiConsts.header.button.active.background,
    color: 'white',
    // color: uiConsts.header.button.color,
    textAlign: 'center',
    border: 'none',
    transition: 'all 500ms ease-in',
    '&:hover': {
      transition: 'background 250ms',
      background: emphasize(uiConsts.header.button.active.background, 0.2),
      color: 'white',
      cursor: 'pointer'
    }
  },
  buttonInactive: {
    background: '#ddd',
    borderColor: '#ddd',
    '&:hover': {
      background: '#ccc',
      borderColor: '#ccc'
    }
  }
};

// ------ redux container ------

const styleSelector = createSelector(
  selectedDisplaySelector, displayListSelector,
  displayGroupsSelector, configSelector,
  (selectedDisplay, displayList, displayGroups, cfg) => ({
    cfg,
    selectedDisplay,
    displayList,
    displayGroups
  })
);

const mapStateToProps = state => (
  styleSelector(state)
);

const mapDispatchToProps = dispatch => ({
  handleClick: (name, group, desc, cfg) => {
    // need to clear out state for new display...
    // first close sidebars for safety
    // (there is an issue when the filter sidebar stays open when changing - revisit this)
    dispatch(setActiveSidebar(''));
    dispatch(setPanelRenderer(null));
    dispatch(setLabels([]));
    dispatch(setLayout({ nrow: 1, ncol: 1, arrange: 'row' }));
    dispatch(setLayout({ pageNum: 1 }));
    dispatch(setFilterView({}));
    dispatch(setFilter({}));
    dispatch(setSort([]));

    dispatch(setSelectedDisplay(name, group, desc));
    dispatch(fetchDisplay(name, group, cfg));
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(injectSheet(staticStyles)(DisplaySelect));
