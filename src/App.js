import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './App.css';
// import {Responsive, WidthProvider} from 'react-grid-layout';
import ReactGridLayout from 'react-grid-layout';
import { RIEInput } from 'riek';

let APP_NAME = 'cuer-convoy';
let VEHICLE_COUNT = 6;
let GRID_COUNTER = 0;


class App extends Component {

    constructor(props) {
        super(props);
        this.saveState = this.saveState.bind(this);
        this.loadState = this.loadState.bind(this);
        this.handleAddItem = this.handleAddItem.bind(this);
        this.handleRemoveItem = this.handleRemoveItem.bind(this);
        this.handleClear = this.handleClear.bind(this);
        this.state = this.getInitialState();
    }

    defaultStaticText() {
        return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].slice(
            0, VEHICLE_COUNT+1
        ).map(function(i) {
            if (i === 0) {
                return 'Staging';
            } else {
                return 'Vehicle ' + i.toString();
            }
        })
    }

    // State:
    // static_items_text: text on immutable items in the grid
    // items: mutable items in the grid
    // {id, x, y, text, static}
    getInitialState() {
        return {
            static_items_text: this.defaultStaticText(),
            items: [],
        };
    }

    saveState() {
        let save_obj = {
            i: this.state.items.map(inf_to_str),
        };
        if (this.state.static_items_text === this.defaultStaticText()) {
            save_obj.s = this.state.static_items_text;
        }
        let json_str = JSON.stringify(save_obj);
        setToHash(json_str);
        saveToLS(json_str);
    }

    loadState() {
        let json_str = (getFromHash() || getFromLS() || '');
        let save_obj = JSON.parse(json_str);
        // console.log("setState - loadState")
        this.setState({
            static_items_text: save_obj.s || this.defaultStaticText(),
            items: save_obj.i.map(str_to_inf),
        });
    }

    toStaticItem(text, i) {
        return {
            id: 's'+i.toString(),
            text: text,
            x: i, y: 0,
            w: 1, h: 1,
            static: true
        };
    }

    getLayout() {
        // fill layout with missing data
        let toLayout = (function(item) {
            if (item.id === undefined ||
                item.x === undefined ||
                item.y === undefined) {
                throw new Error("Item missing id");
            }
            return {
                i: item.id,
                x: item.x, y: item.y,
                w: item.w || 1, h: item.h || 1,
                isResizable: item.isResizable || false,
                static: item.static || false,
            };
        });
        let static_items = this.state.static_items_text.map(this.toStaticItem);
        let layout = static_items.concat(this.state.items).map(toLayout);
        return layout;
    }

    getElements() {
        let createElement = (function(item) {
            let removeStyle = (item.static === true) ? {border: '0px'} : {};
            let removeButtonStyle = {
                position: 'absolute',
                right: '2px',
                top: 0,
                cursor: 'pointer'
            };
            let handleTextChange = (function(key, keyval) {
                this.setState({
                    items: this.state.items.map(
                        (function(item) {
                            if (item.id === key) {
                                item.text = keyval[key];
                            }
                            return item;
                        })
                    ),
                });
            });
            return (
                <div key={ item.id } style={ removeStyle }>
                    <div>
                        <RIEInput className="text"
                            value={ item.text }
                            change={ handleTextChange.bind(this, item.id) }
                            propName={ item.id } />
                    </div>
                    {
                        (item.static === true) ?
                        (null) :
                        (<span className="remove"
                            style={removeButtonStyle}
                            onClick={ this.handleRemoveItem.bind(this, item.id) }>
                                x
                        </span>)
                    }
                </div>
            );
        }).bind(this);
        let itemElement = (function(item) {
            return {
                id: item.id,
                text: item.text,
                static: item.static || false,
            };
        });
        let static_items = this.state.static_items_text.map(this.toStaticItem);
        let elements = (
            static_items.concat(this.state.items).map(itemElement)
        ).map(createElement);
        return elements;
    }

    handleLayoutChange(layout) {
        // console.log("setState - handleLayoutChange");
        // console.log(layout);
        this.setState({
            items: layout.slice(VEHICLE_COUNT+1).map(
                // extract useful information from layout
                (function(item, idx) {
                    return {
                        id: item.i,
                        text: this.state.items[idx].text,
                        x: item.x,
                        y: item.y,
                    }
                }).bind(this)
            ),
        });
        this.saveState();
    }

    handleAddItem(val="") {
        // console.log("setState - handleAddItem");
        this.setState({
            // add a new item
            items: this.state.items.concat({
                id: 'n' + GRID_COUNTER.toString(),
                text: val,
                x: 0, y: Infinity, // puts it at the bottom
            }),
        });
        GRID_COUNTER += 1;
    }

    handleRemoveItem(key) {
        // console.log("setState - handleRemoveItem");
        this.setState({
            items: Array.prototype.filter.call(
                this.state.items, item => item.id!==key
            )
        });
    }

    handleClear() {
        // console.log("setState - handleClear");
        this.setState(this.getInitialState());
        window.location.hash = "";
    }

    render() {
        // console.log('render');
        // console.log(this.state);
        let layout = this.getLayout();
        let elements = this.getElements();
        return (
            <div className="App">
                <Input
                    onAdd={ this.handleAddItem }
                    onClear={ this.handleClear } />
                <ReactGridLayout
                    cols={ VEHICLE_COUNT+1 }
                    rowHeight={ 40 }
                    width={ 1600 }
                    layout={ layout }
                    onLayoutChange={ this.handleLayoutChange.bind(this) }>
                        { elements }
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

function inf_to_str(item) {
    return Object.assign(item, (
        (item.y===Infinity) ? {y:"$inf"} : {}
    ));
}

function str_to_inf(item) {
    return Object.assign(item, (
        (item.y==="$inf") ? {y:Infinity} : {}
    ));
}

function getHashState() {
    return window.location.hash.replace('#', '');
}

function getFromHash() {
    if (!!window.location.hash) {
        let hash = getHashState();
        if (hash !== "") {
            let json = window.atob(hash);
            return json;
        }
    }
    return null;
}

function setToHash(json) {
    if (json.length === 0) {
        window.location.hash = '';
    } else {
        let hash = window.btoa(json);
        window.location.hash = hash;
    }
}

function getFromLS() {
    let ls = null;
    if (window.sessionStorage) {
        try {
            ls = window.localStorage.getItem(APP_NAME);
        }
        catch(e) {}
    }
    return ls;
}

function saveToLS(json) {
    if (window.sessionStorage) {
        window.localStorage.removeItem(APP_NAME);
        window.sessionStorage.setItem(APP_NAME, json);
    }
}

export default App;
