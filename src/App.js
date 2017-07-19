import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './App.css';
// import {Responsive, WidthProvider} from 'react-grid-layout';
import ReactGridLayout from 'react-grid-layout';
import { RIEInput } from 'riek';

let APP_NAME = 'cuer-convoy';


class App extends Component {

    constructor(props) {
        super(props);
        this.toLayout = this.toLayout.bind(this);
        this.fromLayout = this.fromLayout.bind(this);
        this.getInitialState = this.getInitialState.bind(this);
        this.createElement = this.createElement.bind(this);
        this.handleAddItem = this.handleAddItem.bind(this);
        this.handleRemoveItem = this.handleRemoveItem.bind(this);
        this.handleClear = this.handleClear.bind(this);
        this.state = this.getInitialState();
    }

    // fill layout with missing data
    toLayout(item) {
        if (item.id === undefined) {
            console.log(item);
            throw new Error("Item missing id");
        }
        item.i = item.id
        item.w = item.w || 1;
        item.h = item.h || 1;
        item.isResizable = item.isResizable || false;
        return item;
    }

    // extract useful information from layout
    fromLayout(item){
        return {
            id: item.i,
            text: item.text,
            x: item.x,
            y: item.y,
        }
    }

    // State:
    // static_items: immutable items in the grid
    // items: mutable items in the grid
    // newCounter: UID generator for grid items
    // cols: for displaying react-grid
    getInitialState() {
        return {
            static_items: [0, 1, 2, 3, 4, 5, 6].map(function(i) {
                if (i === 0) {
                    return {
                        id: 's'+i.toString(),
                        text: 'Staging',
                        x: i, y: 0,
                        w: 1, h: 1,
                        static: true
                    };
                } else {
                    return {
                        id: 's'+i.toString(),
                        text: 'Vehicle ' + i.toString(),
                        x: i, y: 0,
                        w: 1, h: 1,
                        static: true
                    };
                }
            }),
            items: (getFromHash() || getFromLS() || []).map(this.fromLayout),
            newCounter: 0,
            cols: 7,
        };
    }

    handleLayoutChange(layout) {
        this.setState({items: layout.slice(7).map(this.fromLayout)});
        let save_items = this.state.items;
        // console.log(save_items);
        setToHash(save_items);
        saveToLS(save_items);
    }

    createElement(el) {
        var removeStyle = (el.static === true) ? {border: '0px'} : {};
        var removeButtonStyle = {
            position: 'absolute',
            right: '2px',
            top: 0,
            cursor: 'pointer'
        };
        var text = el.text || '';
        var id = el.id;
        // console.log(id);
        var nullfunc = function(){};
        return (
            <div key={id} style={removeStyle}>
                <div>
                    <RIEInput className="text"
                        value={text}
                        change={nullfunc}
                        propName='title' />
                </div>
                {
                    (el.static === true) ?
                    (null) :
                    (<span className="remove" style={removeButtonStyle} onClick={ this.handleRemoveItem.bind(this, id) }>x</span>)
                }
            </div>
        );
    }

    handleAddItem(val="") {
        this.setState({
            // add a new item
            items: this.state.items.concat({
                id: 'n' + this.state.newCounter.toString(),
                text: val,
                x: 0, y: Infinity, // puts it at the bottom
                w: 1, h: 1,
                isResizable: false,
            }),
            // increment the counter for unique key i
            // TODO cannot change state based on state
            newCounter: this.state.newCounter + 1
        });
        // console.log(this.state.newCounter.toString());
    }

    handleRemoveItem(i) {
        this.setState({items: Array.prototype.filter.call(this.state.items, item => item.i!==i)});
    }

    handleClear() {
        this.setState({items: []});
        window.location.hash = "";
    }

    render() {
        console.log('render');
        let layout = this.state.items.map(this.toLayout).concat(this.state.static_items.map(this.toLayout));
        return (
            <div className="App">
                <Input onAdd={ this.handleAddItem } onClear={ this.handleClear }/>
                <ReactGridLayout
                    cols={this.state.cols}
                    rowHeight={40}
                    width={1600}
                    layout={layout}
                    onLayoutChange={ this.handleLayoutChange.bind(this) }>
                        { this.state.static_items.map(this.createElement) }
                        { this.state.items.map(this.createElement) }
                </ReactGridLayout>
            </div>
        );
    }
}


class Input extends React.Component {

    _handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            this.props.onAdd(e.target.value);
            e.target.value = "";
        }
    }

    _handleButtonPress = () => {
        this.props.onAdd(this.refs.name.value);
        this.refs.name.value = "";
    }

    render() {
        return (
            <div>
                <input ref='name' type="text" onKeyPress={this._handleKeyPress}/>
                <button onClick={ this._handleButtonPress }>Add Person (Enter)</button>
                <button onClick={ this.props.onClear }>Clear</button>
            </div>
        )
    }
}
Input.propTypes = {
    onAdd: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
};

function stringify_with_inf(items) {
    return JSON.stringify(items.map(
        function(item) {
            return Object.assign(item, (
                (item.y===Infinity) ? {y:"$inf"} : {}
            ));
        }
    ));
}

function parse_with_inf(json) {
    let items = JSON.parse(json);
    if (!!items.length) {
        return items.map(
            function(item) {
                return Object.assign(item  , (
                    (item.y==="$inf") ? {y:Infinity} : {}
                ));
            }
        )
    } else {
        return null;
    }
}

function getHashState() {
    return window.location.hash.replace('#', '');
}

function getFromHash() {
    if (!!window.location.hash) {
        let hash = getHashState();
        if (hash !== "") {
            let json = window.atob(hash);
            let items = parse_with_inf(json);
            return items;
        }
    }
    return null;
}

function setToHash(items) {
    if (items.length === 0) {
        window.location.hash = '';
    } else {
        let json = stringify_with_inf(items);
        let hash = window.btoa(json);
        window.location.hash = hash;
    }
}

function getFromLS() {
    let ls = null;
    if (window.sessionStorage) {
        try {
            ls = parse_with_inf(window.localStorage.getItem(APP_NAME));
        }
        catch(e) {}
    }
    return ls;
}

function saveToLS(items) {
    if (window.sessionStorage) {
        window.localStorage.removeItem(APP_NAME);
        window.sessionStorage.setItem(APP_NAME, stringify_with_inf(items));
    }
}

export default App;
