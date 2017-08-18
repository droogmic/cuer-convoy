import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './App.css';
// import {Responsive, WidthProvider} from 'react-grid-layout';
import ReactGridLayout, { WidthProvider } from 'react-grid-layout';
import { RIEInput, RIETags } from 'riek';

const AutoReactGridLayout = WidthProvider(ReactGridLayout);

const APP_NAME = 'cuer-convoy';
const VEHICLE_COUNT = 6;
const LS = false;
const HASH = true;


class App extends Component {
    constructor(props) {
        super(props);
        this.state = this.getInitialState();
    }

    defaultVehicleNames() {
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

    getVehicleId(vehicle_name, vehicle_idx) {
        return vehicle_idx.toString() + vehicle_name.toString();
    }

    getPersonId(vehicle_name, vehicle_idx, person_name, person_idx) {
        return vehicle_idx.toString() + vehicle_name.toString() +
        '-' +
        person_idx.toString() + person_name.toString();
    }

    getDefaultState() {
        let vehicle_data = this.defaultVehicleNames().map(
            function(vehicle_name) {
                return {
                    name: vehicle_name,
                    people: []
                }
            }
        );
        return {
            vehicles: vehicle_data,
        };
    }

    getInitialState() {
        return this.getSavedState();
    }

    getSavedState() {
        let json_str = (
            (HASH && getFromHash()) ||
            (LS && getFromLS()) ||
            '[]'
        );
        let save_obj = JSON.parse(json_str);
        if (save_obj.length===0) {
            return this.getDefaultState();
        }
        let default_vehicle_names = this.defaultVehicleNames()
        let new_vehicles = save_obj.map(
            function(save_vehicle, idx) {
                return {
                    name: save_vehicle.n || default_vehicle_names[idx],
                    people: save_vehicle.p || [],
                    tags: save_vehicle.t || new Set(),
                };
            }
        )
        return {
            vehicles: new_vehicles,
        };
    }

    saveState() {
        let save_obj = this.state.vehicles;
        let default_vehicle_names = this.defaultVehicleNames()
        save_obj = save_obj.map(
            function(vehicle, idx) {
                let save_vehicle = {
                    p: vehicle.people,
                };
                if (vehicle.tags!==undefined && vehicle.tags.length !== 0) {
                    save_vehicle.t = vehicle.tags
                }
                if (vehicle.name !== default_vehicle_names[idx]) {
                    save_vehicle.n = vehicle.name
                }
                return save_vehicle;
            }
        );
        let json_str = JSON.stringify(save_obj);
        let null_vehicle = function(vehicle) {
            return (
                vehicle.n===undefined &&
                vehicle.p.length===0 &&
                vehicle.t!==undefined
            );
        }
        if (save_obj.every(null_vehicle)) {
            json_str = "";
        }
        if (HASH) setToHash(json_str);
        if (LS) saveToLS(json_str);
    }

    loadState() {
        this.setState(this.getSavedState());
    }

    toVehicleItem(vehicle, vehicle_idx) {
        return {
            id: this.getVehicleId(vehicle.name, vehicle_idx),
            name: vehicle.name,
            tags: vehicle.tags || new Set(),
            x: vehicle_idx, y: 0,
            static: true,
        };
    }

    toPersonItem(vehicle, vehicle_idx, person, person_idx) {
        return {
            id: this.getPersonId(
                vehicle.name, vehicle_idx,
                person.name, person_idx
            ),
            name: person.name,
            tags: person.tags || new Set(),
            x: vehicle_idx, y: person_idx,
            vehicle_idx: vehicle_idx,
        };
    }

    getPeopleItems(vehicles) {
        let push_func = function(
            acc, vehicle, vehicle_idx,
            person, person_idx
        ) {
            acc.push(this.toPersonItem(
                vehicle, vehicle_idx,
                person, person_idx
            ));
        };
        let concat_vehicle_people = function(acc, vehicle, vehicle_idx) {
            vehicle.people.forEach(
                push_func.bind(this, acc, vehicle, vehicle_idx)
            );
            return acc;
        };
        return vehicles.reduce(
            concat_vehicle_people.bind(this),
            []
        );
    }

    handleRenameVehicle(vehicle_idx, val) {
        this.setState(prevState => {
            prevState.vehicles[vehicle_idx].name = val;
            return {
                vehicles: prevState.vehicles
            }
        });
        this.saveState();
    }

    handleRetagVehicle(vehicle_idx, val) {
        this.setState(prevState => {
            prevState.vehicles[vehicle_idx].tags = val;
            return {
                vehicles: prevState.vehicles
            }
        });
        this.saveState();
    }

    handleAddPerson(val) {
        this.setState(prevState => {
            prevState.vehicles[0].people.push({
                name: val,
                tags: new Set(),
            });
            return {
                vehicles: prevState.vehicles
            }
        });
        this.saveState();
    }

    handleRemovePerson(vehicle_idx, person_idx) {
        this.setState(prevState => {
            prevState.vehicles[vehicle_idx].people.splice(person_idx, 1);
            return {
                vehicles: prevState.vehicles
            }
        });
        this.saveState();
    }

    handleEditPerson(vehicle_idx, person_idx, person) {
        this.setState(prevState => {
            prevState.vehicles[vehicle_idx].people[person_idx] = person;
            return {
                vehicles: prevState.vehicles
            }
        });
        this.saveState();
    }

    handleClearPeople() {
        this.setState(this.getDefaultState());
        if (HASH) setToHash("");
        if (LS) saveToLS("");
    }

    handleLayoutChange(layout) {
        this.setState(prevState => {
            let all_people = this.getPeopleItems(prevState.vehicles);
            let new_vehicles = prevState.vehicles.map(
                function(vehicle, vehicle_idx) {
                    let new_people = all_people
                        .filter(person => layout.find(
                            grid_item => grid_item.i===person.id
                        ).x===vehicle_idx)
                        .sort(function(person_a, person_b) {
                            return (
                                layout.find(
                                    grid_item => grid_item.i===person_a.id
                                ).y -
                                layout.find(
                                    grid_item => grid_item.i===person_b.id
                                ).y
                            );
                        });
                    return {
                        name: vehicle.name,
                        people: new_people,
                    };
                }
            );
            return {
                vehicles: new_vehicles
            }
        });
        this.saveState();
    }

    getLayout() {
        let itemToGridItem = (function(item) {
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
        let vehicle_items = this.state.vehicles
            .map(this.toVehicleItem.bind(this));
        let people_items = this.getPeopleItems(this.state.vehicles);
        let layout = vehicle_items.concat(people_items).map(itemToGridItem);
        return layout;
    }

    getElements() {
        let createVehicleElement = function(vehicle, vehicle_idx) {
            let handleTextChange = function(val) {
                this.handleRenameVehicle(vehicle_idx, val)
            };
            let handleTagChange = function(val) {
                this.handleRetagVehicle(vehicle_idx, val)
            };
            return (
                <div key={ vehicle.id }>
                    <VehicleItem
                        vehicle={ vehicle }
                        onChangeText={
                            handleTextChange.bind(this)
                        }
                        onChangeTags={
                            handleTagChange.bind(this)
                        }
                    />
                </div>
            );
        };
        let createPersonElement = (function(person, person_idx) {
            let handleTextChange = function(val) {
                this.handleEditPerson(person.vehicle_idx, person_idx, {
                    name: val,
                    tags: person.tags,
                })
            };
            let handleTagChange = function(val) {
                this.handleEditPerson(person.vehicle_idx, person_idx, {
                    name: person.name,
                    tags: val,
                })
            };
            return (
                <div key={ person.id }>
                    <PersonItem
                        person={ person }
                        onClickRemove={
                            this.handleRemovePerson.bind(
                                this, person.vehicle_idx, person_idx
                            )
                        }
                        onChangeText={
                            handleTextChange.bind(this)
                        }
                        onChangeTags={
                            handleTagChange.bind(this)
                        }
                    />
                </div>
            );
        }).bind(this);
        let vehicle_elements = this.state.vehicles
            .map(this.toVehicleItem.bind(this))
            .map(createVehicleElement.bind(this));
        let push_func = function(acc, vehicle, vehicle_idx, person, person_idx) {
            acc.push(
                createPersonElement(this.toPersonItem(
                    vehicle, vehicle_idx,
                    person, person_idx
                ), person_idx)
            );
        };
        let concat_vehicle_people = function(acc, vehicle, vehicle_idx) {
            vehicle.people.forEach(
                push_func.bind(this, acc, vehicle, vehicle_idx)
            );
            return acc;
        };
        let people_elements = this.state.vehicles.reduce(
            concat_vehicle_people.bind(this),
            []
        );
        // let people_elements = this.state.vehicles.reduce(
        //     function(acc, vehicle, vehicle_idx) {
        //         vehicle.people.forEach(
        //             function(acc, vehicle, vehicle_idx, person, person_idx) {
        //                 acc.push(
        //                     createPersonElement(this.toPersonItem(
        //                         vehicle, vehicle_idx,
        //                         person, person_idx
        //                     ), person_idx)
        //                 );
        //             }
        //         );
        //         return acc;
        //     },
        //     []
        // );
        let elements = vehicle_elements.concat(people_elements);
        return elements;
    }

    render() {
        let layout = this.getLayout();
        let elements = this.getElements();
        return (
            <div className="App">
                <Input
                    onAdd={ this.handleAddPerson.bind(this) }
                    onClear={ this.handleClearPeople.bind(this) }
                    state={ this.state }
                />
                <AutoReactGridLayout
                    cols={ VEHICLE_COUNT+1 }
                    rowHeight={ 100 }
                    width={ 1600 }
                    layout={ layout }
                    onLayoutChange={ this.handleLayoutChange.bind(this) }>
                        { elements }
                </AutoReactGridLayout>
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

    _handleJsonPress = () => {
        console.log(this.props.state);
        console.log(JSON.stringify(this.props.state, null, 2));
    }

    render() {
        return (
            <div>
                <input
                    ref='name'
                    type="text"
                    onKeyPress={this._handleKeyPress}/>
                <button onClick={ this._handleButtonPress }>
                    Add Person (Enter)
                </button>
                <button onClick={ this.props.onClear }>
                    Clear
                </button>
                <button onClick={ this._handleJsonPress }>
                    JSON
                </button>
            </div>
        )
    }
}
Input.propTypes = {
    onAdd: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    state: PropTypes.object
};


class VehicleItem extends React.Component {
    handleChangeName(keyval) {
        this.props.onChangeText(keyval[this.props.vehicle.id])
    }
    handleChangeTags(keyval) {
        this.props.onChangeTags(keyval[this.props.vehicle.id])
    }
    render() {
        return (
            <div>
                <div>
                    <RIEInput className="text"
                        value={ this.props.vehicle.name }
                        change={ this.handleChangeName.bind(this) }
                        propName={ this.props.vehicle.id }
                    />
                </div>
                <div>
                    <RIETags className='tags'
                        value={ this.props.vehicle.tags }
                        change={ this.handleChangeTags.bind(this) }
                        propName={ this.props.vehicle.id }
                    />
                </div>
            </div>
        );
    }
}
VehicleItem.propTypes = {
    vehicle: PropTypes.object.isRequired,
    onChangeText: PropTypes.func.isRequired,
    onChangeTags: PropTypes.func.isRequired,
};


class PersonItem extends React.Component {
    handleChangeName(keyval) {
        this.props.onChangeText(keyval[this.props.person.id])
    }
    handleChangeTags(keyval) {
        this.props.onChangeTags(keyval[this.props.person.id])
    }
    render() {
        return (
            <div>
                <div>
                    <RIEInput className="text"
                        value={ this.props.person.name }
                        change={ this.handleChangeName.bind(this) }
                        propName={ this.props.person.id }
                    />
                </div>
                <div>
                    <RIETags className='tags'
                        value={ this.props.person.tags }
                        change={ this.handleChangeTags.bind(this) }
                        propName={ this.props.person.id }
                    />
                </div>
                {
                    (this.props.person.static === true) ?
                    (null) :
                    (<span className="remove"
                        onClick={ this.props.onClickRemove }>
                            X
                    </span>)
                }
            </div>
        );
    }
}
PersonItem.propTypes = {
    // item requires id, static, and text
    person: PropTypes.object.isRequired,
    onClickRemove: PropTypes.func.isRequired,
    onChangeText: PropTypes.func.isRequired,
    onChangeTags: PropTypes.func.isRequired,
};

// function inf_to_str(item) {
//     return Object.assign(item, (
//         (item.y===Infinity) ? {y:"$inf"} : {}
//     ));
// }
//
// function str_to_inf(item) {
//     return Object.assign(item, (
//         (item.y==="$inf") ? {y:Infinity} : {}
//     ));
// }

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
            ls = window.sessionStorage.getItem(APP_NAME);
        }
        catch(e) {}
    }
    return ls;
}

function saveToLS(json) {
    if (window.sessionStorage) {
        window.sessionStorage.removeItem(APP_NAME);
        if (json.length === 0) {
            window.sessionStorage.setItem(APP_NAME, json);
        }
    }
}

export default App;
