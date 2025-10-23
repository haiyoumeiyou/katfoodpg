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
        this.component_data = [];
        this.component_select_options = {};
        this._temporary_selected_options = {};
    }
    async bindOnComponentLoad(callback) {
        this.onComponentLoad = callback;
    }
    async getMeta() {
        this.component_meta = await this.router.getRouteMeta(this.componentInfo);
        const q_params = this.componentInfo.param ? this.componentInfo.param : {};
        const db_data = await this.router.getRouteData(this.componentInfo, q_params);
        if (db_data[0] === 'ok') {
            this.component_data.list = db_data[1];
        }
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
    async InputActionData(event, modal, data) {
        // console.log('modal data when action xecute: ', event.target, data);
        const action_list = this.component_meta.modal_template.fields;
        const action = action_list.find(item => item.f_event_id === event.target.id);
        if (action) {
            if (action.handler === 'data') {
                let data_list = [];
                const endpoint = action.f_data_endpoint;
                // console.log('json: ', data, this.componentInfo);
                if (this.componentInfo.param && action.f_data_key) {
                    const m_param = {[action.f_data_key]:this.componentInfo.param[action.f_data_id]};
                    if (Array.isArray(data)) {
                        data.forEach(row => {
                            const param = {...m_param, ...row};
                            data_list.push(param);
                        });
                    }
                }
                if (data_list.length > 0 && endpoint) {
                    const params = {"data_list":data_list};
                    // console.log(params);
                    const endpoint_data = await this.router.dataExchange(endpoint, params);
                    // console.log(endpoint_data);
                    const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
                    if (endpoint_data[0] === 'ok') {
                        const q_params = this.componentInfo.param ? this.componentInfo.param : {};
                        const db_data = await this.router.getRouteData(this.componentInfo, q_params);
                        if (db_data[0] === 'ok') {
                            this.component_data.list = db_data[1];
                        }
                    }
                    this._commit(this.component_data, endpoint_status);
                }
            }
            if (action.handler === 'file') {
                const endpoint = action.f_data_endpoint;
                const m_param = {[action.f_data_key]:this.componentInfo.param[action.f_data_id]};
                console.log('file: ', data, event, data.files);
                let form_data = new FormData();
                form_data.append("uploaded_file", data.files[0]);
                form_data.append("work_order", JSON.stringify(m_param));
                const endpoint_data = await this.router.fileUpload(endpoint, form_data);
                console.log(endpoint_data);
                
                const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
                if (endpoint_data[0] === 'ok') {
                    const q_params = this.componentInfo.param ? this.componentInfo.param : {};
                    const db_data = await this.router.getRouteData(this.componentInfo, q_params);
                    if (db_data[0] === 'ok') {
                        this.component_data.list = db_data[1];
                    }
                }
                this._commit(this.component_data, endpoint_status);
            }
            if (action.container == 'self' && action.handler == 'print') {
                const endpoint = action.f_data_endpoint;
                const m_param = {[action.f_data_key]:this.componentInfo.param[action.f_data_id]};
                const endpoint_rst = await this.router.printFileExchange(endpoint, m_param);
                this._commit(this.component_data, endpoint_rst);
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
        this.message = this.ui_handle.createElement('p', 'messageholder');
        this.action_bar = this.ui_handle.createElement('p');
        this.input_section = this.ui_handle.createElement('p');
        this.scroll_table = this.ui_handle.createElement('div', 'scroll_table');
        this.table = this.ui_handle.createElement('table');
        this.scroll_table.appendChild(this.table);
        this.component.append(this.message, this.input_section, this.action_bar, this.scroll_table);
    }
    get _inputs() {
        let inputs = {};
        const input_elements = this.input_section.querySelectorAll('input, select')
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
    _resetContent() {
        this.component.innerHTML = '';
    }
    async displayContent(componentMeta, componentData, component_select_options, msg) {
        this.action_bar.innerHTML = '';
        // console.log(componentData);
        if (componentMeta.modal_template.modal_css) {
            this.component.classList.add(componentMeta.modal_template.modal_css);
        }
        if (componentMeta.modal_template&&componentMeta.modal_template.fields&&componentMeta.modal_template.fields.length>0) {
            this.displayInputSection(componentMeta.modal_template, componentData, component_select_options);
        }
        if (componentMeta.list_template&&componentMeta.list_template.fields&&componentMeta.modal_template.fields.length>0) {
            this.displayListSection(componentMeta.list_template, componentData);
        }
        if (componentMeta.modal_template.events&&componentMeta.modal_template.events.length>0) {
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
            this.message.innerHTML = '';
            let css_class = ['alert'];
            if (msg.startsWith('ko')) {
                css_class.push('danger');
            }
            this.ui_handle.alertMessage(msg, this.message, css_class.join(' '), 3000);
        }
        // console.log(this.component);
    }
    displayInputSection(modalTemplate, componentData, component_select_options) {
        this.input_section.innerHTML = '';
        // console.log(component_select_options);
        const fields = modalTemplate.fields;
        fields.forEach(field => {
            const p = this.ui_handle.createElement('p');
            // const span = this.ui_handle.createElement('span');
            // p.appendChild(span);
            const br = this.ui_handle.createElement('br');
            const label = this.ui_handle.createElement('label');
            label.textContent = field.d_label;
            const input = this.ui_handle.createElement(field.f_element);
            input.id = field.f_id;

            input.placeholder = field.d_name;
            if (field.f_type) {
                input.type = field.f_type;
            } 
            if (field.f_css_class) {
                input.classList.add(field.f_css_class);
            }
            if (field.f_data && field.f_id in component_select_options) {
                const defaut_option = this.ui_handle.createElement('option');
                defaut_option.textContent = 'Please choose from list...';
                defaut_option.value = '';
                defaut_option.setAttribute('disabled', true);
                defaut_option.setAttribute('hidden', true);
                defaut_option.setAttribute('selected', true);
                input.appendChild(defaut_option);
                const options = component_select_options[field.f_id];
                // console.log(options, field, componentData);
                options.forEach(row => {
                    const option = this.ui_handle.createElement('option');
                    option.textContent = row[field.f_option_text];
                    option.value = row[field.f_option_val];
                    // console.log(option.value, componentData[field.f_id]);
                    if (componentData && field.f_id in componentData && option.value == componentData[field.f_id]) {
                        option.setAttribute('selected', true);
                    }
                    input.appendChild(option);
                });
                // console.log(input);
            }
            p.append(label, br, input);
        
            if (field.f_event_id) {
                // console.log(field);
                const item = this.ui_handle.createElement(field.f_event_type);
                item.textContent = field.d_name;
                item.id = field.f_event_id;
                item.data_id = field.f_data_id;
                item.data_field = field.f_id;
                const ibr = this.ui_handle.createElement('br');
                p.append(ibr, item);
            }
            this.input_section.append(p);
            // console.log(span);
        });
        // console.log(this.input_section);
    }
    displayListSection(listTemplate, componentData) {
        this.table.innerHTML = '';
        const fields = listTemplate.fields;
        const actions = listTemplate.events;
        // console.log(componentData);
        const head = this.ui_handle.createElement('thead');
        const thr = this.ui_handle.createElement('tr');
        const body = this.ui_handle.createElement('tbody');
        head.appendChild(thr);

        this.table.append(head, body);
        fields.forEach(field => {
            const th = this.ui_handle.createElement('th');
            th.innerText = field.d_name;
            if (field.f_sort) {
                th.innerText = field.d_name + ' ' + field.f_sort;
                th.sort = field.f_id;
                // th.classList.add('sort');
            }
            thr.append(th);
        });
        if (actions && actions.length>0) {
            const th = this.ui_handle.createElement('th');
            th.innerText = "Action";
            thr.append(th);         
        } 
        if (componentData.list && componentData.list.length > 0) {
            const table_caption = this.ui_handle.createElement('caption');
            table_caption.textContent = "Total row: " + componentData.list.length;;
            this.table.prepend(table_caption);
            componentData.list.forEach(row => {
                // console.log(row);
                const tr = this.ui_handle.createElement('tr');
                fields.forEach(field => {
                    const td = this.ui_handle.createElement('td');
                    td.innerText = row[field.f_id]?row[field.f_id]:'';
                    if (field.f_css_class) {
                        td.classList.add(field.f_css_class);
                    }
                    tr.append(td);
                });
                if (actions && actions.length>0) {
                    // console.log(row);
                    const td = this.ui_handle.createElement('td');
                    actions.forEach(event => {
                        const action = this.ui_handle.createElement(event.f_type);
                        action.textContent = event.d_name;
                        action.id = event.f_event_id;
                        action.data_id = row[event.f_id];
                        action.name = event.f_id;
                        if (event.container) {
                            action.container = event.container;
                        }
                        if (event.f_enable_indicator && row[event.f_enable_indicator]) {
                            // console.log(row, row[event.f_enable_indicator]);
                            action.disabled = true;
                        }
                        td.append(action);
                    }); 
                    tr.append(td);
                }
                body.append(tr);
            });
        }
    }
    bindActionEvent(handler) {
        this.action_bar.addEventListener('click', event => {
            // console.log('Action dialog: ', event.target, event.target.name, this._inputs);
            handler(event, this.component, this._inputs);
        });
    }
    bindInputActionEvent(handler) {
        this.input_section.addEventListener('click', event => {
            // console.log('Action dialog: ', event.target, event.target.name, this._inputs);
            if (event.target.tagName === 'BUTTON') {
                let data;
                const data_field = document.getElementById(event.target.data_field);
                console.log(data_field)
                if (data_field && data_field.tagName === 'TEXTAREA') {
                    data = this.ui_handle.constructor.txtToJson(data_field.value);
                }
                if (data_field && data_field.type === 'file') {
                    data = data_field;
                }
                handler(event, this.component, data);
            }   
        });
    }
    bindCloseEvent(handler) {
        this.component.addEventListener('click', event => {
            // console.log('close dialog: ', event.target, event.target.name, this._inputs);
            if (event.target.name === 'close') {
                handler(this.component, this._inputs);
            }
        });
    }
    bindSelectEvent(handler) {
        this.component.addEventListener('change', event => {
            // console.log(event.target);
            if (event.target.tagName === 'SELECT') {
                handler(this.component, this._inputs);
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
        this.view.bindInputActionEvent(this.handleInputActionEvent);
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
    handleInputActionEvent = (event, modal, data) => {
        this.model.InputActionData(event, modal, data);
    }
    handleCloseEvent = (modal, data) => {
        this.model.closeModal(modal, data);
    }
    handleSelectEvent = (modal, data) => {
        this.model.selectedData(modal, data);
    }
}

