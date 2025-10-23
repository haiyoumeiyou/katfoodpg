import { UiHandle } from "../module/ui_handle.js";

export function render(componentInfo, componentElement, appRouter) {
    const component = new Controller(new Model(componentInfo, appRouter), new View(componentElement));
    return component;
}

class Model {
    constructor(componentInfo, appRouter) {
        this.componentInfo = componentInfo;
        this.router = appRouter; 
        this.component_meta = {};
        this.component_data = [];
        this.sort_direction = null;
        this.component_select_options = {};
        this._temporary_selected_options = {};
    }
    async bindOnComponentLoad(callback) {
        this.onComponentLoad = callback;
    }
    async getMeta() {
        // console.log(this.componentInfo);
        const param = this.componentInfo.param ? this.componentInfo.param : {}
        this.component_data.param = param;
        this.component_meta = await this.router.getRouteMeta(this.componentInfo);
        const endpoint_data = await this.router.getRouteData(this.componentInfo, param);
        const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
        if (endpoint_status === 'ok'){
            this.component_data.table_data = endpoint_data[1];
        }
        if (this.component_meta.action_bar) {
            this.component_data.select_options = await this.getSelectOptions(this.component_meta.action_bar);
        }
        return this.component_meta;
    }
    async getSelectOptions(fields) {
        let select_options = {};
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
                select_options = {...select_options, ...row};
            })
        }
        return select_options;
    }
    async _commit(data, msg) {
        this.onComponentDataChange(this.component_meta, data, msg);
    }
    async bindComponentDataChange(callback) {
        this.onComponentDataChange = callback;
    }
    async sortData(sortField) {
        // console.log('sort action: ', sortField, sortField.sort);
        let sortedData = this.component_data.table_data;
        // console.log('data: ', sortedData);
        this.sort_direction = this.sort_direction=='asc'?'dsc':'asc';
        sortedData = await UiHandle.listSort(sortedData, sortField, this.sort_direction);
        this.component_data.table_data = sortedData;
        this._commit(this.component_data);
    }
    async actionData(event, modal, data) {
        // console.log('modal data when action xecute: ', event.target, data);
        let param = {}
        if (this.component_meta.fn_key&&this.componentInfo.param) {
            for (const [key, val] of Object.entries(this.component_meta.fn_key)) {
                param[key] = this.componentInfo.param[val];
            }
        }
        const q_param = {...param, ...data};
        console.log(q_param);
        const action_list = this.component_meta.table_template.events;
        const action = action_list.find(item => item.f_event_id === event.target.id);
        if (action) {
            if (action.handler === 'self') {
                const endpoint = await this.router.constructor.metaSectionToDataEndpoint(action.meta_section)
                // console.log(endpoint);
                if (endpoint) {
                    const endpoint_data = await this.router.dataExchange(endpoint, q_param);
                    // console.log(endpoint_data);
                    const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
                    if (endpoint_data[0] === 'ok') {
                        const db_data = endpoint_data[1];
                        // console.log(db_data);
                        this.component_data.table_data = db_data;
                    }
                    this._commit(this.component_data, endpoint_status);
                }
            }
        }
    }
    async actionbarData(event, container, data) {
        let param = {}
        if (this.component_meta.fn_key&&this.componentInfo.param) {
            for (const [key, val] of Object.entries(this.component_meta.fn_key)) {
                param[key] = this.componentInfo.param[val];
            }
        }
        const q_param = {...param, ...data};
        const action_list = this.component_meta.action_bar;
        const action = action_list.find(item => item.f_event_id === event.target.id);
        // console.log(q_param);
        if (action && action.f_action_endpoint) {
            const endpoint = action.f_action_endpoint;
            // console.log(endpoint);
            if (endpoint) {
                const endpoint_data = await this.router.dataExchange(endpoint, q_param);
                // console.log(endpoint_data);
                const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
                if (endpoint_data[0] === 'ok') {
                    const db_data = endpoint_data[1];
                    // console.log(db_data);
                    this.component_data.table_data = db_data;
                }
                this._commit(this.component_data, endpoint_status);
            }
        }
        if (action && action.meta_section) {
            // console.log('view action: ', action);
            // action.param = param;
            // console.log('view action:', action, param);
            const component_module = action.handler;
            const { render } = await import(component_module);
            container.returnValue = JSON.stringify(data);
            container.close();
            await render(action, container, this.router);
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
        this.message = this.ui_handle.createElement('p', 'messageholder');
        this.action_bar = this.ui_handle.createElement('p');
        this.scroll_table = this.ui_handle.createElement('div', 'scroll_table');
        this.table = this.ui_handle.createElement('table');
        this.scroll_table.appendChild(this.table);
        this.component.append(this.message, this.action_bar, this.scroll_table);
        this._temp_selected = null;
        this._temp_search = null;
        this.input_holder = {};
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
    _resetContent() {
        this.component.innerHTML = '';
    }
    async displayContent(componentMeta, componentData, msg) {
        if (componentMeta.action_bar) {
            this.displayActionbar(componentMeta.action_bar, componentData);
        }
        if (componentMeta.table_template) {
            this.displayTable(componentMeta.table_template, componentData.table_data);
        }

        let is_focus = true;
        this.action_bar.querySelectorAll('input').forEach((input) => {
            console.log(input);
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
        // close.classList.add('right');
        this.action_bar.append(close);
        if (msg) {
            let css_class = ['alert'];
            if (msg.startsWith('ko')) {
                css_class.push('danger');
            }
            this.message.innerHTML = '';
            this.ui_handle.alertMessage(msg, this.message, css_class.join(' '), 3000);
        }
    }
    displayActionbar(actionBar, componentData) {
        this.action_bar.innerHTML = '';
        if (actionBar.length > 0) {
            actionBar.forEach(act_item => {
                const item = this.ui_handle.createElement(act_item.f_type);
                item.textContent = act_item.d_name;
                item.id = act_item.f_event_id;
                item.name = act_item.f_id;
                if (act_item.css_class) {
                    item.classList.add(act_item.css_class);
                }
                // console.log(act_item);
                if (act_item.f_type == 'input') {
                    item.placeholder = act_item.d_name;
                }
                if (act_item.f_id in this.input_holder && this.input_holder[act_item.f_id] && act_item.f_type == 'input') {
                    item.value = this.input_holder[act_item.f_id];
                }
                if (act_item.f_data && act_item.f_id in componentData.select_options) {
                    const option = this.ui_handle.createElement('option');
                    option.textContent = 'Please choose from list...';
                    option.value = '';
                    option.setAttribute('disabled', true);
                    option.setAttribute('hidden', true);
                    option.setAttribute('selected', true);
                    item.appendChild(option);
                    const options = componentData.select_options[act_item.f_id];
                    options.forEach(row => {
                        const option = this.ui_handle.createElement('option');
                        option.textContent = row[act_item.f_option_text];
                        option.value = row[act_item.f_option_val];
                        if (this._temp_selected && this._temp_selected[act_item.f_id] == option.value) {
                            option.setAttribute('selected', true);
                        }
                        // if ((act_item.f_id in componentData && option.value === componentData[field.f_id]) || (field.f_default_val && option.value === field.f_default_val)) {
                        //     option.setAttribute('selected', true);
                        // }
                        item.appendChild(option);
                    });
                }
                if (act_item.container) {
                    item.container = act_item.container;
                }
                if (componentData.param && act_item.f_id in componentData.param) {
                    // console.log(componentData.param);
                    item.data_id = componentData.param[act_item.f_id];
                }
                if (act_item.f_enable_calc && act_item.f_enable_indicators) {
                    // console.log(row, row[event.f_enable_indicator]);
                    item.disabled = !UiHandle[act_item.f_enable_calc](componentData.table_data, act_item.f_enable_indicators);
                }
                // console.log(act_item, item, this._temp_search);
                if (act_item.f_clear_onload && !this._temp_search) {
                    item.value = this._temp_search;
                }
                this.action_bar.append(item);
            });
        }
    }
    displayTable(tableTemplate, tableData) {
        this.table.innerHTML = '';
        const head = this.ui_handle.createElement('thead');
        const thr = this.ui_handle.createElement('tr');
        const body = this.ui_handle.createElement('tbody');
        head.append(thr);

        this.table.append(head, body);
        tableTemplate.fields.forEach(field => {
            const th = this.ui_handle.createElement('th');
            th.innerText = field.d_name;
            if (field.f_sort) {
                th.innerText = field.d_name + ' ' + field.f_sort;
                th.sort = field.f_id;
                // th.classList.add('sort');
            }
            thr.append(th);
        });
        if (tableTemplate.events && tableTemplate.events.length>0) {
            const th = this.ui_handle.createElement('th');
            th.innerText = "Action";
            thr.append(th);         
        } 
        if (tableData) {
            tableData.forEach(row => {
                // console.log(row);
                const tr = this.ui_handle.createElement('tr');
                tableTemplate.fields.forEach(field => {
                    const td = this.ui_handle.createElement('td');
                    td.innerText = row[field.f_id]?row[field.f_id]:'';
                    if (field.f_css_class) {
                        td.classList.add(field.f_css_class);
                    }
                    if (field.f_edit) {
                        const input = this.ui_handle.createElement('input');
                        input.id = field.f_id;
                        input.value = row[field.f_id]?row[field.f_id]:'';
                        // if (field.f_enable_calc && field.f_enable_indicators) {
                        //     // console.log(row, row[event.f_enable_indicator]);
                        //     if (UiHandle[field.f_enable_calc](row, field.f_enable_indicators)) {
                        //         // td.contentEditable = true;
                        //         td.innerText = '';
                        //         td.append(input);
                        //     }
                        // }
                        if (field.f_css_class) {
                            td.classList.add(field.f_css_class);
                        }
                        if (field.f_data_id && row[field.f_data_id]) {
                            input.data_id = field.f_data_id;
                            input.data_val = row[field.f_data_id];
                            // console.log(row, row[field.f_data_id]);
                        }
                        td.innerText = '';
                        td.append(input);
                    }
                    tr.append(td);
                });
                if (tableTemplate.events && tableTemplate.events.length > 0) {
                    // console.log(row);
                    const td = this.ui_handle.createElement('td');
                    tableTemplate.events.forEach(event => {
                        const action = this.ui_handle.createElement(event.f_type);
                        action.textContent = event.d_name;
                        action.id = event.f_event_id;
                        action.data_id = row[event.f_id];
                        action.name = event.f_id;
                        if (event.container) {
                            action.container = event.container;
                        }
                        if (event.f_enable_indicator && row[event.f_enable_indicator]) {
                            console.log(row, row[event.f_enable_indicator]);
                            action.disabled = true;
                        }
                        td.append(action);
                    }); 
                    tr.append(td);
                }
                if (this._temp_selected) {
                    for (const [k, v] of Object.entries(this._temp_selected)) {
                        if (row[k] == v) {
                            body.append(tr);
                        }
                    }
                } else {
                    body.append(tr);
                }
            });
        }
    }
    bindTableSortEvent(handler) {
        this.table.addEventListener('click', event => {
            // console.log('table click event: ', event);
            if (event.target.sort) {
                // console.log('sorting event:', event.target.sort);
                handler(event.target);
            }
        })
    }
    bindActionEvent(handler) {
        // this.action_bar.addEventListener('click', event => {
        //     // console.log('Action dialog: ', event.target, event.target.name, this._inputs);
        //     handler(event, this.component, this._inputs);
        // });
        this.table.addEventListener('click', event => {
            if (event.target.tagName === 'BUTTON') {
                // console.log(event.target.parentNode);
                this.input_holder = this._inputs;
                const param = {[event.target.name]:event.target.data_id};
                const data = {...this._inputs, ...param};
                this._temp_search = null;
                handler(event, this.component, data);
            }
        });
    }
    bindActionbarEvent(handler) {
        this.action_bar.addEventListener('change', event => {
            // console.log(event.target);
            if (event.target.tagName === 'SELECT') {
                this.input_holder = this._inputs;
                this._temp_selected = { [event.target.id]:event.target.value};
                handler(event, this.component, this._inputs);
            }
        });
        this.action_bar.addEventListener('keypress', event => {
            // console.log(event.target);
            if ((event.key === 'Enter' || event.Key === 'Tab') && event.target.tagName === 'INPUT') {
                this.input_holder = this._inputs;
                this._temp_search = { [event.target.id]:event.target.value};
                const param = {[event.target.name]:'%' + event.target.value + '%'}
                handler(event, this.component, param);
            }
        });
        this.action_bar.addEventListener('click', event => {
            if (event.target.tagName === 'BUTTON') {
                // console.log(event.parent);
                const param = {};
                this.input_holder = this._inputs;
                handler(event, this.component, param);
            }
        });
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
        this.view.bindTableSortEvent(this.handleSortEvent);
        // this.view.bindTableActionEvent(this.handleActionEvent);
        this.view.bindActionEvent(this.handleActionEvent);
        this.view.bindActionbarEvent(this.handleActionbarEvent);
        this.view.bindCloseEvent(this.handleCloseEvent);
    }

    onComponentLoad = async () => {
        const component_meta = await this.model.getMeta();
        this.view.displayContent(component_meta, this.model.component_data);
    }
    onComponentDataChange = (component_meta, data, msg) => {
        this.view.displayContent(component_meta, data, msg);
    }
    handleSortEvent = sortField => {
        this.model.sortData(sortField);
    }
    handleActionEvent = (event, modal, data) => {
        this.model.actionData(event, modal, data);
    }
    handleActionbarEvent = (event, container, data) => {
        this.model.actionbarData(event, container, data);
    }
    handleCloseEvent = (modal, data) => {
        this.model.closeModal(modal, data);
    }
}

