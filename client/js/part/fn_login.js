import { UiHandle } from "../module/ui_handle.js";

export function render(componentInfo, componentElement, appRouter) {
    const component = new Controller(new Model(componentInfo, appRouter, componentElement), new View(componentElement));
    return component;
}

class Model {
    constructor(componentInfo, appRouter, componentElement) {
        this.componentInfo = componentInfo;
        this.componentElement = componentElement;
        this.router = appRouter; 
        // console.log('page init: ', this.route, this.router);
        this.component_meta = {};
        this.component_data = [];
    }
    async bindOnComponentLoad(callback) {
        this.onComponentLoad = callback;
    }
    async getMeta() {
        this.component_meta = await this.router.getRouteMeta(this.componentInfo);
        // this.component_data = await this.router.getRouteData(this.componentInfo);
        return this.component_meta;
    }
    _commit(data, msg) {
        this.onComponentDataChange(this.component_meta, data, msg);
    }
    async bindComponentDataChange(callback) {
        this.onComponentDataChange = callback;
    }
    async actionData(event, component, data) {
        // console.log('modal data when action xecute: ', event.target, data);
        // modal.returnValue = JSON.stringify(data);
        const action_list = this.component_meta.modal_template.events;
        const event_id = event.target.event_id ? event.target.event_id : event.target.id;
        const action = action_list.find(item => item.f_event_id === event_id);
        if (action) {
            if (action.handler === 'self') {
                const endpoint = await this.router.constructor.metaSectionToDataEndpoint(action.meta_section)
                // console.log(endpoint);
                if (endpoint) {
                    const endpoint_data = await this.router.dataExchange(endpoint, data);
                    const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
                    if (endpoint_data[0] === 'ok') {
                        const db_data = endpoint_data[1];
                        const local_token = await this.router.setLocalToken(db_data.jwt);
                        if (local_token) {
                            // console.log(local_token, this.componentInfo);
                            // this.router.navigateTo(this.componentInfo.from, this.componentElement);
                            document.location.href = this.componentInfo.from.path;
                        }
                    }
                    this.component_data = data;
                    this._commit(this.component_data, endpoint_status);
                }
            }
        }
    }
    closeModal(modal, data) {
        console.log('modal data when close: ', data);
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
        this.action_bar = this.ui_handle.createElement('p');
    }
    get _inputs() {
        let inputs = {};
        const input_elements = this.component.querySelectorAll('input')
        if (input_elements.length > 0) {
            input_elements.forEach(input_element => {
                if (input_element.value) {
                    inputs[input_element.id] = input_element.value;
                }
            });
        }
        return inputs;
    }
    _resetContent() {
        this.component.innerHTML = '';
    }
    async displayContent(componentMeta, componentData, msg) {
        this.component.innerHTML = '';
        this.action_bar.innerHTML = '';
        // console.log(componentData);
        const title = this.ui_handle.createElement('h3');
        title.textContent = componentMeta.title?componentMeta.title:'Modal';
        this.component.append(title);
        if (componentMeta.modal_template&&componentMeta.modal_template.fields&&componentMeta.modal_template.fields.length>0) {
            const fields = componentMeta.modal_template.fields;
            fields.forEach(field => {
                const p = this.ui_handle.createElement('p');
                const label = this.ui_handle.createElement('label');
                label.textContent = field.d_name;
                const input = this.ui_handle.createElement(field.f_element);
                input.id = field.f_id;
                input.placeholder = field.d_name;
                if (field.f_id in componentData) {
                    input.value = componentData[field.f_id]
                }
                if (field.f_event_id) {
                    input.event_id = field.f_event_id;
                }
                if (field.f_type) {
                    input.type = field.f_type;
                } 
                p.append(label, input);
                this.component.append(p);
            });
        }
        if (componentMeta.modal_template.events&&componentMeta.modal_template.events.length>0) {
            this.component.append(this.action_bar)
            const actions = componentMeta.modal_template.events;
            actions.forEach(action => {
                const item = this.ui_handle.createElement(action.f_type);
                item.textContent = action.d_name;
                item.event_id = action.f_event_id;
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
    bindLoginEvent(handler) {
        this.component.addEventListener('keypress', event => {
            if (event.key === 'Enter') {
                if (event.target.event_id) {
                    handler(event, this.component, this._inputs);
                }
            }
        })
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
}

class Controller {
    constructor(model, view){
        this.model = model;
        this.view = view;

        this.model.bindOnComponentLoad(this.onComponentLoad);
        this.onComponentLoad();

        this.model.bindComponentDataChange(this.onComponentDataChange);
        this.view.bindActionEvent(this.handleActionEvent);
        this.view.bindLoginEvent(this.handleActionEvent);
        this.view.bindCloseEvent(this.handleCloseEvent);
    }

    onComponentLoad = async () => {
        const component_meta = await this.model.getMeta();
        this.view.displayContent(component_meta, this.model.component_data);
    }
    onComponentDataChange = (component_meta, data, msg) => {
        document.location.href = '/';
        this.view.displayContent(component_meta, data, msg);
    }
    handleActionEvent = (event, modal, data) => {
        this.model.actionData(event, modal, data);
    }
    handleCloseEvent = (modal, data) => {
        this.model.closeModal(modal, data);
    }
}

