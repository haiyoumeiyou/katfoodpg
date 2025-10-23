import { UiHandle } from "../module/ui_handle.js";

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
        this.component_data = {};
    }
    async bindOnComponentLoad(callback) {
        this.onComponentLoad = callback;
    }
    async getMeta() {
        this.component_meta = await this.router.getRouteMeta(this.componentInfo);
        const q_params = this.componentInfo.param ? this.componentInfo.param : {};
        console.log(q_params);
        const fetch_data = await this.router.getRouteData(this.componentInfo, q_params);
        if(fetch_data[0] == 'ok') {
            this.component_data = fetch_data[1];
        }
        return this.component_meta;
    }
    async _commit(data, msg) {
        this.onComponentDataChange(this.component_meta, data, msg);
    }
    async bindComponentDataChange(callback) {
        this.onComponentDataChange = callback;
    }
    async actionData(event, modal, data) {
        // console.log('modal data when action xecute: ', event.target, data);
        const action_list = this.component_meta.modal_template.events;
        const action = action_list.find(item => item.f_event_id === event.target.id);
        if (action) {
            const endpoint = await this.router.constructor.metaSectionToDataEndpoint(action.meta_section);
            if (action.f_data_key && action.f_data_val && this.componentInfo.param) {
                const m_params = {[action.f_data_key]: this.componentInfo.param[action.f_data_val]}
                const q_params = {...m_params, ...data}
                // console.log(endpoint, q_params);
                const endpoint_data = await this.router.dataExchange(endpoint, q_params);
                // console.log(endpoint_data);
                const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
                this._commit(this.component_data, endpoint_status);
                // if (endpoint_data[0] === 'ko') {
                //     this._commit(this.component_data, endpoint_status);
                // }

            }
        }
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
        this.caption_section = this.ui_handle.createElement('h2');
        this.field_section = this.ui_handle.createElement('p');
        this.action_bar = this.ui_handle.createElement('p');
        this.component.append(this.caption_section, this.field_section, this.action_bar)
    }
    get _inputs() {
        let inputs = {};
        const input_elements = this.field_section.querySelectorAll('input, select')
        if (input_elements.length > 0) {
            input_elements.forEach(input_element => {
                if (input_element.value && input_element.value.length>0) {
                    inputs[input_element.id] = input_element.value;
                } else {
                    inputs[input_element.id] = null;
                }
            });
        }
        return inputs;
    }
    async displayContent(componentMeta, componentData, msg) {
        this.action_bar.innerHTML = '';
        if ('caption' in componentMeta.modal_template) {
            console.log(componentMeta, componentData);
            this.displayCaption(componentMeta.modal_template.caption, componentData.caption_data[0]);
        }
        if (componentMeta.modal_template) {
            this.displayFields(componentMeta.modal_template);
        }

        let is_focus = true;
        this.field_section.querySelectorAll('input').forEach((input) => {
            if (input.value) {
                input.classList.add('success');
                // input.setAttribute('disabled', true);
            }
            if (is_focus && input.value === '') {
                input.focus();
                is_focus = false;
            }
        });

        const close = this.ui_handle.createElement('button');
        close.textContent = "Close";
        close.name = 'close';
        this.action_bar.append(close);

        if (is_focus) {
            close.focus();    
        }

        if (msg) {
            let css_class = ['alert'];
            if (msg.startsWith('ko')) {
                css_class.push('danger');
            }
            this.ui_handle.alertMessage(msg, this.component, css_class.join(' '), 5000);
        }
    }
    displayCaption(captionMeta, captionData) {
        // console.log(captionMeta);
        this.caption_section.innerHTML = '';
        if (captionData) {
            const caption_data = captionData;
            captionMeta.forEach(field => {
                if (field.f_id in caption_data) {
                    const label = this.ui_handle.createElement('label');
                    label.textContent = field.d_name + ': ' + caption_data[field.f_id] + ', ';
                    this.caption_section.append(label);
                }
            });
        }
    }
    async displayFields(modalTemplate) {
        this.field_section.innerHTML = '';
        const fields = modalTemplate.fields;
            // console.log(componentData);
        if (fields) {
            fields.forEach(field => {
                const p = this.ui_handle.createElement('p');
                const label = this.ui_handle.createElement('label');
                label.textContent = field.d_name;
                const input = this.ui_handle.createElement(field.f_element, field.css_class?field.css_class:null);
                input.id = field.f_id;
                input.placeholder = field.d_name;
                // if (field.f_id in componentData) {
                //     input.value = componentData[field.f_id]
                // }
                if (field.f_type) {
                    input.type = field.f_type;
                } 
                if (field.f_attr) {
                    input.setAttribute(field.f_attr, true);
                }
                // if (is_focus && !input.value){
                //     input.focus();
                //     is_focus = false;
                // }
                p.append(label, input);
                this.field_section.append(p);
            });
        }
        
        if (modalTemplate.events&&modalTemplate.events.length>0) {
            const actions = modalTemplate.events;
            actions.forEach(action => {
                const item = this.ui_handle.createElement(action.f_type, action.css_class?action.css_class:null);
                item.textContent = action.d_name;
                item.id = action.f_event_id;
                item.name = action.f_id;
                this.action_bar.append(item);
            });
        }
    }
    bindActionEvent(handler) {
        this.action_bar.addEventListener('click', event => {
            handler(event, this.component, this._inputs);
        });
    }
    bindCloseEvent(handler) {
        this.component.addEventListener('click', event => {
            // console.log('close dialog: ', event.target, event.target.name, this._inputs);
            if (event.target.name === 'close') {
                handler(this.component, {});
            }
        });
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
    }

    onComponentLoad = async () => {
        const component_meta = await this.model.getMeta();
        this.view.displayContent(component_meta, this.model.component_data, this.model.component_select_options);
    }
    onComponentDataChange = (component_meta, data, msg) => {
        this.view.displayContent(component_meta, data, msg);
    }
    handleActionEvent = (event, modal, data) => {
        this.model.actionData(event, modal, data);
    }
    handleCloseEvent = (modal, data) => {
        this.model.closeModal(modal, data);
    }
}

