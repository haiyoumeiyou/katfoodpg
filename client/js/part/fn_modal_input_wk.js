import { UiHandle } from "../module/ui_handle.js";
import { element_build } from "../module/element_handle.js";

export function render(componentInfo, componentElement, appRouter) {
    const component = new Controller(new Model(componentInfo, appRouter), new View(componentElement));
    return component;
}

class Model {
    constructor(componentInfo, appRouter) {
        this.componentInfo = componentInfo;
        this.router = appRouter; 
        // console.log('page init: ', this.route, this.router);
        this.component_meta = {};
        this.component_data = [];
        this.component_select_options = {};
        this._temporary_selected_options = {};
    }
    async bindOnComponentLoad(callback) {
        this.onComponentLoad = callback;
    }
    async getMeta() {
        this.component_meta = await this.router.getRouteMeta(this.componentInfo);
        // this.component_data = await this.router.getRouteData(this.componentInfo);
        this.component_select_options = await this.getSelectOptions(this.component_meta.modal_template.fields);
        return this.component_meta;
    }
    async getSelectOptions(fields) {
        let component_select_options = {};
        let promises = [];
        fields.forEach(row => {
            if (row.f_data) {
                const promise = new Promise(async (resolve, reject) => {
                    let params = {};
                    if (row.f_rel_id && this._temporary_selected_options[row.f_rel_id]) {
                        params = {[row.f_rel_id]:this._temporary_selected_options[row.f_rel_id]}
                    }
                    const endpoint_data = await this.router.dataExchange(row.f_data, params);
                    if (endpoint_data[0] == 'ok') {
                        const data = {[row.f_id]:endpoint_data[1]};
                        resolve(data);
                    } else {
                        reject(console.log(JSON.stringify(endpoint_data)));
                    }
                });
                promises.push(promise);
            }
        });
        const promisedData = await Promise.all(promises);
        if (promisedData.length>0) {
            promisedData.forEach(row => {
                component_select_options = {...component_select_options, ...row};
            })
        }
        return component_select_options;
    }
    async _commit(data, msg) {
        this.component_select_options = await this.getSelectOptions(this.component_meta.modal_template.fields);
        this.onComponentDataChange(this.component_meta, data, msg);
    }
    async bindComponentDataChange(callback) {
        this.onComponentDataChange = callback;
    }
    async actionData(event, modal, data) {
        // console.log('modal data when action xecute: ', event.target, data);
        modal.returnValue = JSON.stringify(data);
        const action_list = this.component_meta.modal_template.events;
        const action = action_list.find(item => item.f_event_id === event.target.id);
        if (action) {
            if (action.handler === 'self') {
                const endpoint = await this.router.constructor.metaSectionToDataEndpoint(action.meta_section)
                // console.log(endpoint);
                if (endpoint) {
                    const endpoint_data = await this.router.dataExchange(endpoint, data);
                    // console.log(endpoint_data);
                    const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
                    if (endpoint_data[0] === 'ok') {
                        const db_data = endpoint_data[1];
                        for (const key in db_data) {
                            data[key] = db_data[key];
                        }
                    }
                    this.component_data = data;
                    this._commit(this.component_data, endpoint_status);
                }
            }
        }
    }
    selectedData(modal, data) {
        this.component_data = data;
        this._temporary_selected_options = data;
        this._commit(data);
    }
    closeModal(modal, data) {
        // console.log('modal data when close: ', data);
        modal.returnValue = JSON.stringify(data);
        modal.close();
    }
}

class View {
    constructor(container){
        this.component = container;
        if (this.component) {
            this.component.innerHTML = '';
        }
        this.ui_handle = new UiHandle(this.component);
        this.component.showModal();
        this.action_bar = this.ui_handle.createElement('p');
    }
    get _inputs() {
        let inputs = {};
        const input_elements = this.component.querySelectorAll('input, select')
        if (input_elements.length > 0) {
            input_elements.forEach(input_element => {
                if (input_element.value && input_element.value.length>0) {
                    inputs[input_element.id] = input_element.value;
                } else {
                    inputs[input_element.id] = null;
                }
                if (input_element.intended_value && input_element.intended_value.length>0) {
                    inputs[input_element.id] = input_element.intended_value;
                }
            });
        }
        return inputs;
    }
    _resetContent() {
        this.component.innerHTML = '';
    }
    async displayContent(componentMeta, componentData, component_select_options, msg) {
        this.component.innerHTML = '';
        this.action_bar.innerHTML = '';
        // console.log(componentData);
        const title = this.ui_handle.createElement('h3');
        title.textContent = componentMeta.title?componentMeta.title:'Modal';
        this.component.append(title);
        if (componentMeta.modal_template&&componentMeta.modal_template.fields&&componentMeta.modal_template.fields.length>0) {
            let is_focus = true;
            const fields = componentMeta.modal_template.fields;
            // console.log(componentData);
            fields.forEach(field => {
                const data = componentData;
                data['options'] = component_select_options;
                const element = element_build.field_backward_compatible(field, data);
                // const p = this.ui_handle.createElement('p');
                // const label = this.ui_handle.createElement('label');
                // label.textContent = field.d_name;
                // const input = this.ui_handle.createElement(field.f_element);
                // input.id = field.f_id;
                // input.placeholder = field.d_name;
                // if (field.f_id in componentData) {
                //     input.value = componentData[field.f_id]
                // }
                // if (field.f_type) {
                //     input.type = field.f_type;
                // } 
                // if (field.f_data && field.f_id in component_select_options) {
                //     const option = this.ui_handle.createElement('option');
                //     option.textContent = 'Please choose from list...';
                //     option.value = '';
                //     option.setAttribute('disabled', true);
                //     option.setAttribute('hidden', true);
                //     option.setAttribute('selected', true);
                //     input.appendChild(option);
                //     const options = component_select_options[field.f_id];
                //     options.forEach(row => {
                //         const option = this.ui_handle.createElement('option');
                //         option.textContent = row[field.f_option_text];
                //         option.value = row[field.f_option_val];
                //         if ((field.f_id in componentData && option.value === componentData[field.f_id]) || (field.f_default_val && option.value === field.f_default_val)) {
                //             option.setAttribute('selected', true);
                //         }
                //         input.appendChild(option);
                //     });
                // }
                // if (field.f_attr) {
                //     input.setAttribute(field.f_attr, true);
                // }
                // if (is_focus && !input.value){
                //     input.focus();
                //     is_focus = false;
                // }
                // p.append(label, input);
                this.component.append(element);
            });
        }
        if (componentMeta.modal_template.events&&componentMeta.modal_template.events.length>0) {
            this.component.append(this.action_bar)
            const actions = componentMeta.modal_template.events;
            actions.forEach(action => {
                const item = this.ui_handle.createElement(action.f_type);
                item.textContent = action.d_name;
                item.id = action.f_event_id;
                item.name = action.f_id;
                this.action_bar.append(item);
            });
        }
        const close = this.ui_handle.createElement('button');
        close.textContent = "Close";
        close.name = 'close';
        this.action_bar.append(close);
        if (msg) {
            let css_class = ['alert'];
            if (msg.startsWith('ko')) {
                css_class.push('danger');
            }
            this.ui_handle.alertMessage(msg, this.component, css_class.join(' '), 3000);
        }
    }
    bindActionEvent(handler) {
        this.action_bar.addEventListener('click', event => {
            // console.log('Action dialog: ', event.target, event.target.name, this._inputs);
            handler(event, this.component, this._inputs);
        })
    }
    bindCloseEvent(handler) {
        this.component.addEventListener('click', event => {
            // console.log('close dialog: ', event.target, event.target.name, this._inputs);
            if (event.target.name === 'close') {
                handler(this.component, this._inputs);
            }
        })
    }
    bindSelectEvent(handler) {
        this.component.addEventListener('change', event => {
            // console.log(event.target);
            if (event.target.tagName === 'SELECT') {
                handler(this.component, this._inputs);
            }
        })
    }
}

class Controller {
    constructor(model, view){
        this.model = model;
        this.view = view;

        this.model.bindOnComponentLoad(this.onComponentLoad);
        this.onComponentLoad();

        this.model.bindComponentDataChange(this.onComponentDataChange);
        this.view.bindActionEvent(this.handleActionEvent);
        this.view.bindCloseEvent(this.handleCloseEvent);
        this.view.bindSelectEvent(this.handleSelectEvent);
    }

    onComponentLoad = async () => {
        const component_meta = await this.model.getMeta();
        this.view.displayContent(component_meta, this.model.component_data, this.model.component_select_options);
    }
    onComponentDataChange = (component_meta, data, msg) => {
        this.view.displayContent(component_meta, data, this.model.component_select_options, msg);
    }
    handleActionEvent = (event, modal, data) => {
        this.model.actionData(event, modal, data);
    }
    handleCloseEvent = (modal, data) => {
        this.model.closeModal(modal, data);
    }
    handleSelectEvent = (modal, data) => {
        this.model.selectedData(modal, data);
    }
}

