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
    async getPageData(param) {
        const endpoint = await this.router.constructor.metaSectionToDataEndpoint(this.componentInfo.meta_section);
        const endpoint_data = await this.router.dataExchange(endpoint, param);
        const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
        this.component_data = endpoint_data[1];
        // console.log(endpoint, this.component_data, param_key, d_param);

        // const pivot_keys = this.component_meta.table_template.fields_attr;
        // if ('table_data' in this.component_data) {
        //     const tableData = await this.router.api_handle.pivotData(this.component_data.table_data, pivot_keys.f_row_key, pivot_keys.f_data_id, pivot_keys.f_id);
        //     this.component_data.table_data = tableData;
        // }
        // if ('column_data' in this.component_data) {
        //     const row_key = {[pivot_keys.f_data_val]:pivot_keys.f_row_key,[pivot_keys.d_name]:pivot_keys.f_row_name};
        //     this.component_data.column_data.unshift(row_key);
        // }
        if ('caption_data' in this.component_data) {
            let captionData = this.component_data.caption_data[0];
            // captionData['data_count'] = this.component_data.table_data.length;
            this.component_data.caption_data = captionData;
        }
        this._commit(this.component_data, endpoint_status);
    }
    // async getComponentData(endpoint, param) {
    //     const fields = this.component_meta.modal_template.fields;
    //     const current_field = fields.find(item => item.eid === param.assm_conf_id);
    //     // console.log(fields, current_field);
    //     // const endpoint = this.component_meta.modal_template.fields_attr.f_data_endpoint;
    //     const modal_param = this.componentInfo.param ? this.componentInfo.param : {};
    //     const m_param = {[this.component_meta.modal_template.modal_key.k_name]:modal_param[this.component_meta.modal_template.modal_key.k_val]};
    //     const q_param = {...param, ...m_param, ...current_field};
    //     // console.log(q_param);
    //     const endpoint_rst = await this.router.dataExchange(endpoint, q_param);
    //     const endpoint_status = endpoint_rst[0] === 'ok' ? endpoint_rst[0] : endpoint_rst.join(', ');
    //     if (endpoint_rst[0] === 'ok') {
    //         this.component_data.field_data = endpoint_rst[1];
    //     }
    //     // console.log(q_param, endpoint_rst);
    //     return {"data":this.component_data, "status":endpoint_status};
    // }
    async getMeta() {
        this.component_meta = await this.router.getRouteMeta(this.componentInfo);
        const q_params = this.componentInfo.param ? this.componentInfo.param : {};
        // console.log(this.componentInfo);
        // this.component_data.caption_data = q_params;
        // const f_endpoint = this.component_meta.modal_template.fields_data;
        // if (f_endpoint) {
        //     const f_data = await this.router.dataExchange(f_endpoint, q_params);
        //     const endpoint_status = f_data[0] === 'ok' ? f_data[0] : f_data.join(', ');
        //     if (f_data[0] === 'ok') {
        //         const fields = f_data[1];
        //         this.component_meta.modal_template.fields = fields;
        //     }
        // }
        // const d_endpoint = await this.router.constructor.metaSectionToDataEndpoint(this.componentInfo.meta_section);
        await this.getPageData(q_params);
        // const m_param = {[this.component_meta.modal_template.modal_key.k_name]:q_params[this.component_meta.modal_template.modal_key.k_val]};
        // console.log(d_endpoint, m_param);
        // const d_endpoint_data = await this.router.dataExchange(d_endpoint, m_param);
        // console.log(d_endpoint_data);
        // if (d_endpoint_data[0] === 'ok') {
        //     this.component_data.field_data = d_endpoint_data[1];
        // }
        // this.component_data = await this.router.getRouteData(this.componentInfo);
        // console.log(this.component_meta);
        return this.component_meta;
    }
    async _commit(data, msg) {
        this.onComponentDataChange(this.component_meta, data, msg);
    }
    async bindComponentDataChange(callback) {
        this.onComponentDataChange = callback;
    }
    async actionData(event, modal, data) {
        // console.log(data);
        const action_list = this.component_meta.modal_template.events;
        const action = action_list.find(item => item.f_event_id === event.target.id);
        if (action) {
            if (action.handler == 'file') {
                const endpoint = action.f_data;
                const q_params = {...data, ...this.component_data.caption_data}
                const endpoint_status = await this.router.fileExchange(endpoint, q_params);
                this._commit(this.component_data, endpoint_status); 
            }
        }
    }
    closeModal(modal) {
        const q_params = this.componentInfo.param ? this.componentInfo.param : {};
        modal.returnValue = JSON.stringify(q_params);
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
    async displayContent(componentMeta, componentData, msg) {
        this.action_bar.innerHTML = '';
        if ('caption' in componentMeta.modal_template) {
            // console.log(componentMeta, componentData);
            this.displayCaption(componentMeta.modal_template.caption, componentData.caption_data);
        }
        if (componentMeta.modal_template && componentData.field_data) {
            this.displayFields(componentMeta.modal_template, componentData.field_data);
        }
        if (componentMeta.modal_template.events && 'caption_data' in componentData) {
            this.displayActionbar(componentMeta.modal_template.events, componentData.caption_data)
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
            this.ui_handle.alertMessage(msg, this.component, css_class.join(' '), 3000);
        }
    }
    displayActionbar(actionbar, captionData) {
        this.action_bar.innerHTML = '';
        actionbar.forEach(nav_item => {
            const item = this.ui_handle.createElement(nav_item.f_type);
            item.textContent = nav_item.d_name;
            item.id = nav_item.f_event_id;
            item.name = nav_item.f_id;
            if (nav_item.container) {
                item.container = nav_item.container;
            }
            if (captionData && nav_item.f_id in captionData) {
                // console.log(componentData.param);
                item.data_id = captionData[nav_item.f_id];
            }
            this.action_bar.append(item);
        });
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
    async displayFields(modalTemplate, componentData) {
        this.field_section.innerHTML = '';
        const div = this.ui_handle.createElement('div', 'flex_container');
        this.field_section.append(div);
        const fields = modalTemplate.fields;
        const field_attr = modalTemplate.fields_attr;
        
        let col_div = {};
        const max_row = 3;
        const max_col = Math.trunc(fields.length/max_row);
        // console.log(max_col);
        for (let i = 0; i < max_col; i++) {
            col_div[i] = this.ui_handle.createElement('div');
            div.append(col_div[i]);
        }

        let row_count = 0;
        let col_count = 0;
        if (fields && fields.length > 0) {
            fields.forEach((field) => {
                if (row_count == (max_row+1)) {
                    row_count = 0;
                    col_count++;
                } 
                const p = this.ui_handle.createElement('p');
                const br = this.ui_handle.createElement('br');
                const label = this.ui_handle.createElement('label');
                label.textContent = field[field_attr.d_name];
                const input = this.ui_handle.createElement(field_attr.f_element, field_attr.f_css_class);
                input.id = field_attr.f_id;
                input.data_id = field_attr.f_data_id;
                input.data_val = field[field_attr.f_data_val];
                // console.log(componentData);
                if (componentData.length > 0) {
                    const input_val = componentData.find(item => item.assm_conf_id === field[field_attr.f_data_val]);
                    if (input_val) {
                        // console.log(input_val[field_attr.f_id]);
                        input.value = input_val[field_attr.f_id];
                    }
                }

                p.append(label, br, input);
                col_div[col_count].append(p);
                row_count++;
            });
        }
    }
    // bindDataChangeEvent(handler) {
    //     this.field_section.addEventListener('keypress', event => {
    //         if (event.key === "Enter" && event.target.tagName === 'INPUT') {
    //             // console.log(event);
    //             const param = {[event.target.id]:event.target.value, [event.target.data_id]:event.target.data_val}
    //             // console.log(param);
    //             handler(event, this.component, param);
    //         }
    //     });
    //     this.field_section.addEventListener('focus', event => {
    //         if (event.target.tagName === 'INPUT') {
    //             // console.log(event);
    //             event.target.style.background = "orange";
    //             event.target.select();
    //         }
    //     }, true)
    // }
    bindActionEvent(handler) {
        this.action_bar.addEventListener('click', event => {
            // console.log('Action dialog: ', event.target, event.target.name, this._inputs);
            const param = {[event.target.name]:event.target.data_id}
            handler(event, this.component, param);
        });
    }
    bindCloseEvent(handler) {
        this.component.addEventListener('click', event => {
            // console.log('close dialog: ', event.target, event.target.name, this._inputs);
            if (event.target.name === 'close') {
                handler(this.component);
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
        this.view.displayContent(component_meta, this.model.component_data);
    }
    onComponentDataChange = (component_meta, data, msg) => {
        this.view.displayContent(component_meta, data, msg);
    }
    handleActionEvent = (event, modal, data) => {
        this.model.actionData(event, modal, data);
    }
    handleCloseEvent = (modal) => {
        this.model.closeModal(modal);
    }
}

