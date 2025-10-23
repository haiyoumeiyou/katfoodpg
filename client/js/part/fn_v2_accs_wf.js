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
    async getComponentData(endpoint, param) {
        const endpoint_rst = await this.router.dataExchange(endpoint, param);
        const endpoint_status = endpoint_rst[0] === 'ok' ? endpoint_rst[0] : endpoint_rst.join(', ');
        if (endpoint_rst[0] === 'ok') {
            this.component_data = endpoint_rst[1];
        }
        console.log(param, endpoint_rst);
        return {"data":this.component_data, "status":endpoint_status};
    }
    async getMeta() {
        this.component_meta = await this.router.getRouteMeta(this.componentInfo);
        let q_param = {};
        if ("component_setup" in this.component_meta) {
            if ("local_data" in this.component_meta.component_setup && this.component_meta.component_setup.local_data == "localStorage") {
                let local_params = {};
                const local_key = this.component_meta.component_setup.local_data_key?this.component_meta.component_setup.local_data_key:null;
                if (local_key) {
                    local_key.forEach(key_pair => {
                        local_params[key_pair['f_id']] = UiHandle.getLocalStorageItem(key_pair['local_key']);
                    });
                }
                if (!local_params) {
                    console.log('no local param');
                    return {"meta":this.component_meta, "status":"local data not found, please inform supervisor !!!"};
                }
                q_param = {...local_params, ...this.componentInfo.param?this.componentInfo.param:{}};
            }
        }
        this.component_meta.param = q_param;
        // console.log(this.component_meta.param);
        const d_endpoint = await this.router.constructor.metaSectionToDataEndpoint(this.componentInfo.meta_section);
        return this.getComponentData(d_endpoint, q_param);
    }
    async _commit(data, msg) {
        this.onComponentDataChange(this.component_meta, data, msg);
    }
    async bindComponentDataChange(callback) {
        this.onComponentDataChange = callback;
    }
    async trackScan(action, data) {
        const param = {...data, ...this.component_meta.param};
        const endpoint = await this.router.constructor.metaSectionToDataEndpoint(action.meta_section);

        const rst = await this.getComponentData(endpoint, param);
        this._commit(rst.data, rst.status);
    }
    async accsScan(action, data) {
        const param = {...data, ...this.component_meta.param};
        const have_all_required_field = UiHandle.checkRequiredInput(data, this.component_meta.action_template.required_action_params?this.component_meta.action_template.required_action_params:null);
        // console.log(have_all_required_field);
        if (have_all_required_field[0] && action && 'meta_section' in action) {
            const endpoint = await this.router.constructor.metaSectionToDataEndpoint(action.meta_section);
            const rst = await this.getComponentData(endpoint, param);
            this._commit(rst.data, rst.status);
        } else {
            this._commit(this.component_data, null);
        }
    }
    async dataChange(event, modal, data) {
        const action_list = [
            // ...this.component_meta.list_template.events?this.component_meta.list_template.events:[], 
            ...this.component_meta.action_template.fields?this.component_meta.action_template.fields:[],
            // ...this.component_meta.dialog_template.fields?this.component_meta.dialog_template.fields:[]
        ];
        // console.log('data when action xecute: ', event, data, action_list, this.component_meta);
        const action = action_list.find(item => item.f_event_id === event.target.event_id);
        if ('f_handle' in action) {
            this[action.f_handle](action, data);
        }
    }
}

class View {
    constructor(container){
        this.component = container;
        if (this.component) {
            this.component.innerHTML = '';
        }
        this.ui_handle = new UiHandle(this.component);
        this.title_section = this.ui_handle.createElement('p');
        this.action_section = this.ui_handle.createElement('p');
        this.list_section = this.ui_handle.createElement('p');
        this.component.append(this.title_section, this.action_section, this.list_section)
        this.input_holder = null;
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
            });
        }
        return inputs;
    }
    async displayContent(componentMeta, componentData, msg) {
        if (msg && msg.startsWith('ko')) {
            this.input_holder = {};
            // console.log('clear holder');
        }
        if ('title_template' in componentMeta) {
            // console.log(componentMeta, componentData);
            this.displayTitle(componentMeta.title_template, componentData[componentMeta.title_template.data_source]?componentData[componentMeta.title_template.data_source]:componentMeta.component_setup);
        }
        if ('action_template' in componentMeta && Object.keys(componentData).length > 0) {
            this.displayAction(componentMeta.action_template);
        }
        if ('list_template' in componentMeta) {
            this.displayList(componentMeta.list_template, componentData[componentMeta.list_template.data_source]?componentData[componentMeta.list_template.data_source]:null);
        }
        
        let is_focus = true;
        this.component.querySelectorAll('input').forEach((input) => {
            if (input.value) {
                input.classList.add('success');
                // input.setAttribute('disabled', true);
            }
            if (is_focus && input.value === '') {
                input.focus();
                is_focus = false;
            }
        });

        this.component.style['background-color'] = null;  
        if (msg) {
            let css_class = ['alert'];
            if (msg.startsWith('ko')) {
                css_class.push('danger');
                this.component.style['background-color'] = 'pink';
                UiHandle.playSound(750, 'square', 550);
            }
            // this.ui_handle.alertMessage(msg, this.component, css_class.join(' '), 9000);
            this.ui_handle.alertMessage(msg, this.action_section, css_class.join(' '), 9000);
        }
    }
    displayTitle(titleMeta, titleData) {
        // console.log(titleMeta);
        this.title_section.innerHTML = '';
        if (titleData) {
            // console.log(titleData);
            const title_data = Array.isArray(titleData)?titleData[0]:titleData;
            titleMeta.fields.forEach(field => {
                if (field.f_id in title_data) {
                    const field_element = this.ui_handle.createElement(field.f_element);
                    field_element.textContent = field.d_name + ': ' + title_data[field.f_id];
                    this.title_section.append(field_element);
                }
            });
        }
    }
    displayAction(actionTemplate) {
        this.action_section.innerHTML = '';
        actionTemplate.fields.forEach(act_item => {
            const item = this.ui_handle.createElement(act_item.f_element);
            item.id = act_item.f_id;
            item.event_id = act_item.f_event_id;
            item.textContent = act_item.d_name;
            if (act_item.f_element == 'input') {
                item.placeholder = act_item.d_name;
            }
            if (act_item.container) {
                item.container = act_item.container;
            }
            if (this.input_holder && act_item.f_id in this.input_holder && this.input_holder[act_item.f_id] && act_item.f_element == 'input') {
                item.value = this.input_holder[act_item.f_id];
            }
            
            this.action_section.append(item);
        });
    }
    
    async displayList(listTemplate, componentData) {
        this.list_section.innerHTML = '';
        if (componentData && componentData.length > 0) {
            componentData.forEach(row => {
                const li = this.ui_handle.createElement('li');
                let li_text = '';
                listTemplate.fields.forEach(field => {
                    li_text = li_text.concat(''.concat(field.d_name, ': ', row[field.f_id]), ', ');
                });
                const span = this.ui_handle.createElement('li');
                // console.log(row, li_text);
                span.textContent = li_text;
            
                if (listTemplate.events && listTemplate.events.length > 0) {
                    listTemplate.events.forEach(event => {
                        const action = this.ui_handle.createElement(event.f_element);
                        action.textContent = event.d_name;
                        action.event_id = event.f_event_id;
                        action.data_id = row[event.f_id];
                        action.id = event.f_id;
                        if (event.container) {
                            action.container = event.container;
                        }
                        if (event.f_enable_indicator && row[event.f_enable_indicator]) {
                            // console.log(row, row[event.f_enable_indicator]);
                            action.disabled = true;
                        }
                        li.append(action);
                    }); 
                }
                li.append(span);

                this.list_section.append(li);
            });
        }
        
    }
    bindDataChangeEvent(handler) {
        this.component.addEventListener('keypress', event => {
            if (event.key === "Enter" && event.target.tagName === 'INPUT') {
                handler(event, this.component, this._inputs);
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
        this.view.bindDataChangeEvent(this.handleDataChangeEvent);
    }

    onComponentLoad = async () => {
        // const component_meta = await this.model.getMeta();
        // this.view.displayContent(component_meta['meta'], this.model.component_data, component_meta['status']);
        const component_data = await this.model.getMeta();
        this.view.displayContent(this.model.component_meta, this.model.component_data, component_data['status']);
    }
    onComponentDataChange = (component_meta, data, msg) => {
        this.view.displayContent(component_meta, data, msg);
    }
    handleDataChangeEvent = (event, modal, data) => {
        const have_all_required_field = UiHandle.checkRequiredInput(data, this.model.component_meta.action_template.required_action_params?this.model.component_meta.action_template.required_action_params:null);
        if (have_all_required_field[0]) {
            // console.log(have_all_required_field);
            this.view.input_holder = {};
        } else {
            this.view.input_holder = data;
        }
        this.model.dataChange(event, modal, data);
    }
}

