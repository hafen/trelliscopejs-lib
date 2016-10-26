import React from 'react';
import injectSheet from 'react-jss';
import { connect } from 'react-redux';
import { RadioButton, RadioButtonGroup } from 'material-ui/RadioButton';
import Divider from 'material-ui/Divider';
import { createSelector } from 'reselect';
import NumericInput from './NumericInput';
import { setLayout } from '../actions';
import { layoutSelector } from '../selectors';
import uiConsts from '../styles/uiConsts';

const SidebarLayout = ({ sheet: { classes }, layout, handleChange }) => {
  let content = <div />;
  if (layout.nrow) {
    content = (
      <div>
        <div className={classes.row}>
          <div className={classes.label}>Rows:</div>
          <div className={classes.nInput}>
            <NumericInput
              arrows
              value={layout.nrow}
              size={5} min={1} step={1}
              onChange={nr =>
                handleChange({ nrow: nr, ncol: layout.ncol, arrange: layout.arrange })
              }
            />
          </div>
        </div>
        <Divider />
        <div className={classes.row}>
          <div className={classes.label}>Columns:</div>
          <div className={classes.nInput}>
            <NumericInput
              arrows
              value={layout.ncol}
              size={5} min={1} step={1}
              onChange={nc =>
                handleChange({ nrow: layout.nrow, ncol: nc, arrange: layout.arrange })
              }
            />
          </div>
        </div>
        <Divider />
        <div className={classes.row}>
          Arrangement:
        </div>
        <div className={classes.row}>
          <RadioButtonGroup
            name="arrangement"
            defaultSelected={layout.arrange}
            onChange={(e, ar) => handleChange({
              nrow: layout.nrow, ncol: layout.ncol, arrange: ar
            })}
          >
            <RadioButton
              value="row"
              label={
                <span className={classes.inputLabelSpan}>
                  By row&nbsp;&nbsp;
                  <i className={`icon-byrow ${classes.inputIcon}`} />
                </span>}
              className={classes.inputRadio}
              labelStyle={{ marginTop: -8 }}
            />
            <RadioButton
              value="column"
              label={
                <span className={classes.inputLabelSpan}>
                  By column&nbsp;&nbsp;
                  <i className={`icon-bycol ${classes.inputIcon}`} />
                </span>
              }
              className={classes.inputRadio}
              labelStyle={{ marginTop: -8 }}
            />
          </RadioButtonGroup>
        </div>
      </div>
    );
  }
  return (content);
};

SidebarLayout.propTypes = {
  sheet: React.PropTypes.object,
  layout: React.PropTypes.object,
  handleChange: React.PropTypes.func
};

// ------ static styles ------

const staticStyles = {
  row: {
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 8,
    paddingBottom: 6,
    width: uiConsts.sidebar.width - 30,
    display: 'inline-block'
  },
  label: {
    lineHeight: '28px',
    float: 'left'
  },
  nInput: {
    float: 'right'
  },
  inputRadio: {
    marginBottom: 5,
    marginTop: 0
  },
  inputLabelSpan: {
    lineHeight: '40px',
    verticalAlign: 'middle'
  },
  inputIcon: {
    fontSize: 23,
    verticalAlign: 'text-bottom'
  }
};

// ------ redux container ------

const stateSelector = createSelector(
  layoutSelector,
  layout => ({
    layout
  })
);

const mapStateToProps = state => (
  stateSelector(state)
);

const mapDispatchToProps = dispatch => ({
  handleChange: (layout) => {
    dispatch(setLayout(layout));
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(injectSheet(staticStyles)(SidebarLayout));
