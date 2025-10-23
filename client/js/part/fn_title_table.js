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
        // this.title_data = {};
        // this.component_select_options = {};
        // this._temporary_selected_options = {};
        this.sort_direction = null;
    }
    async bindOnComponentLoad(callback) {
        this.onComponentLoad = callback;
    }
    async getMeta() {
        this.component_meta = await this.router.getRouteMeta(this.componentInfo);
        const param = this.componentInfo.param ? this.componentInfo.param : {}
        this.component_data.param = param;
        const endpoint_data = await this.router.getRouteData(this.componentInfo, param);
        const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
        if (endpoint_status === 'ok'){
            this.component_data.table_data = endpoint_data[1];
        }
        const title_endpoint = this.component_meta.title_template ? this.component_meta.title_template.f_data : null;
        const title_data = await this.router.dataExchange(title_endpoint, param);
        this.component_data.title_data = title_data[1][0];
        // this.component_select_options = await this.getSelectOptions(this.component_meta.modal_template.fields);
        return this.component_meta;
    }
    // async getSelectOptions(fields) {
    //     let component_select_options = {};
    //     let promises = [];
    //     fields.forEach(row => {
    //         if (row.f_data) {
    //             const promise = new Promise(async (resolve, reject) => {
    //                 let params = {};
    //                 if (row.f_rel_id && this._temporary_selected_options[row.f_rel_id]) {
    //                     params = {[row.f_rel_id]:this._temporary_selected_options[row.f_rel_id]}
    //                 }
    //                 // console.log(params);
    //                 const endpoint_data = await this.router.dataExchange(row.f_data, params);
    //                 if (endpoint_data[0] == 'ok') {
    //                     const data = {[row.f_id]:endpoint_data[1]};
    //                     resolve(data);
    //                 } else {
    //                     reject(console.log(JSON.stringify(endpoint_data)));
    //                 }
    //             });
    //             promises.push(promise);
    //         }
    //     });
    //     const promisedData = await Promise.all(promises);
    //     if (promisedData.length>0) {
    //         promisedData.forEach(row => {
    //             component_select_options = {...component_select_options, ...row};
    //         })
    //     }
    //     return component_select_options;
    // }
    async _commit(data, msg) {
        this.onComponentDataChange(this.component_meta, data, msg);
    }
    bindonComponentDataChange(callback) {
        this.onComponentDataChange = callback;
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
        const action_list = [...this.component_meta.action_bar, ...this.component_meta.table_template.events];
        const action = action_list.find(item => item.f_event_id === event.target.id);
        // console.log(action);
        if (action) {
            if (action.handler === 'self') {
                const endpoint = await this.router.constructor.metaSectionToDataEndpoint(action.meta_section)
                // console.log(endpoint);
                if (endpoint) {
                    const endpoint_data = await this.router.dataExchange(endpoint, q_param);
                    const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
                    if (endpoint_data[0] === 'ok') {
                        const db_data = endpoint_data[1];
                        // console.log(db_data);
                        this.component_data.table_data = db_data;
                    }
                    this._commit(this.component_data, endpoint_status);
                }
            } 
            if (action.container == 'self' && action.handler == 'file') {
                const endpoint = action.f_data;
                const endpoint_rst = await this.router.printFileExchange(endpoint, q_param);
                this._commit(this.component_data, endpoint_rst);
            }
            if (action.container == 'dialog') {
                action.param = data;
                // console.log('view action:', action);
                const component_module = action.handler;
                const { render } = await import(component_module);
                await render(action, modal, this.router);
            }
        }
    }
    async tableDataChange(event, data){
        let param = {}
        if (this.component_meta.fn_key&&this.componentInfo.param) {
            for (const [key, val] of Object.entries(this.component_meta.fn_key)) {
                param[key] = this.componentInfo.param[val];
            }
        }
        const q_param = {...param, ...data};
        const field_list = this.component_meta.table_template.fields
        const action_field = field_list.find(item => item.f_id === event.target.id);
        if (action_field && action_field.f_data) {
            const endpoint = action_field.f_data;
            const endpoint_data = await this.router.dataExchange(endpoint, q_param);
            const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
            if (endpoint_data[0] === 'ok') {
                const db_data = endpoint_data[1];
                // console.log(db_data);
                this.component_data.table_data = db_data;
            }
            this._commit(this.component_data, endpoint_status);
        }
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
    // selectedData(modal, data) {
    //     this.component_data = data;
    //     this._temporary_selected_options = data;
    //     this._commit(data);
    // }
    closeModal(modal, data) {
        // console.log('modal data when close: ', data);
        for (const key in data) {
            this.component_data[key] = data[key];
        }
        modal.returnValue = JSON.stringify(this.component_data);
        location.reload();
    }
}

class View {
    constructor(container){
        this.component = container;
        if (this.component) {
            this.component.innerHTML = '';
        }
        this.ui_handle = new UiHandle(this.component);
        // this.component.showModal();
        this.message = this.ui_handle.createElement('p', 'messageholder');
        this.scroll_table = this.ui_handle.createElement('div', 'scroll_table');
        this.table = this.ui_handle.createElement('table');
        this.scroll_table.appendChild(this.table);
        this.title_bar = this.ui_handle.createElement('p');
        this.action_bar = this.ui_handle.createElement('p');
        this.dialog = this.ui_handle.createElement('dialog');
        this.component.append(this.message, this.title_bar, this.dialog, this.action_bar, this.scroll_table);
        this.last_modified_field_id;
        this.focus_field_id;
    }
    get _inputs() {
        let inputs = {};
        const input_elements = this.component.querySelectorAll('input, select');
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
        // console.log(componentData);
        if (componentMeta.title_template&&'title_data' in componentData) {
            this.displayTitlebar(componentMeta.title_template, componentData.title_data);
        }
        if (componentMeta.action_bar) {
            this.displayActionbar(componentMeta.action_bar, componentData);
        }
        if (componentMeta.table_template) {
            this.displayTable(componentMeta.table_template, componentData.table_data);
        }
        if (msg) {
            let css_class = ['alert'];
            if (msg.startsWith('ko')) {
                css_class.push('danger');
            }
            // console.log(css_class);
            this.message.innerHTML = '';
            this.ui_handle.alertMessage(msg, this.message, css_class.join(' '), 3000);
        }
        let is_focus = true;
        this.table.querySelectorAll('input').forEach((input) => {
            // console.log('checking focus field: ', input.data_id, input.data_val, this.focus_field_id);
            if (is_focus && input.value === '') {
                input.focus();
                is_focus = false;
            }
            if (is_focus && input.data_val === this.focus_field_id) {
                input.focus();
                input.setSelectionRange(0, input.value.length);
                is_focus = false;
            }
        });
    }
    displayTitlebar(titleTemplate, titleData) {
        this.title_bar.innerHTML = '';
        const h2 = this.ui_handle.createElement('h2');
        let title_array = [];
        for (const [key, val] of Object.entries(titleTemplate.f_display_fields)) {
            const string = "".concat(val + ': ', titleData[key] + ', ');
            title_array.push(string);
            // console.log(key, val, titleData[key], string, title_array);
        }
        h2.textContent = "".concat(...title_array);
        this.title_bar.appendChild(h2);
    }
    displayActionbar(actionbar, componentData) {
        this.action_bar.innerHTML = '';
        actionbar.forEach(nav_item => {
            const item = this.ui_handle.createElement(nav_item.f_type);
            item.textContent = nav_item.d_name;
            item.id = nav_item.f_event_id;
            item.name = nav_item.f_id;
            if (nav_item.css_class) {
                item.classList.add(nav_item.css_class);
            }
            if (nav_item.container) {
                item.container = nav_item.container;
            }
            if (componentData.param && nav_item.f_id in componentData.param) {
                // console.log(componentData.param);
                item.data_id = componentData.param[nav_item.f_id];
            }
            if (nav_item.f_enable_calc && nav_item.f_enable_indicators) {
                // console.log(row, row[event.f_enable_indicator]);
                item.disabled = !UiHandle[nav_item.f_enable_calc](componentData.table_data, nav_item.f_enable_indicators);
            }
            this.action_bar.append(item);
        });
    }
    displayTable(tableTemplate, tableData) {
        this.table.innerHTML = '';
        const head = this.ui_handle.createElement('thead');
        const thr = this.ui_handle.createElement('tr');
        const body = this.ui_handle.createElement('tbody');
        head.appendChild(thr);

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
        if (Array.isArray(tableData)) {
            // console.log(tableData);
            let next_focus = false;
            tableData.forEach(row => {
                const tr = this.ui_handle.createElement('tr');
                tableTemplate.fields.forEach(field => {
                    const td = this.ui_handle.createElement('td');
                    td.innerText = row[field.f_id]?row[field.f_id]:'';
                    td.id = field.f_id;
                    if (field.f_edit) {
                        const input = this.ui_handle.createElement('input');
                        input.id = field.f_id;
                        input.value = row[field.f_id]?row[field.f_id]:'';
                        if (field.f_enable_calc && field.f_enable_indicators) {
                            // console.log(row, row[event.f_enable_indicator]);
                            if (UiHandle[field.f_enable_calc](row, field.f_enable_indicators)) {
                                // td.contentEditable = true;
                                td.innerText = '';
                                td.appendChild(input);
                            }
                        }
                        if (field.f_css_class) {
                            td.classList.add(field.f_css_class);
                        }
                        if (field.f_data_id && row[field.f_data_id]) {
                            input.data_id = field.f_data_id;
                            input.data_val = row[field.f_data_id];
                            // console.log(row, row[field.f_data_id]);
                            if (next_focus) {
                                this.focus_field_id = input.data_val;
                                next_focus = false;
                            }
                            if (this.last_modified_field_id && this.last_modified_field_id === input.data_val) {
                                next_focus = true;
                            }
                        }

                    }
                    // if (field.f_data_id && row[field.f_data_id]) {
                    //     td.data_id = field.f_data_id;
                    //     td.data_val = row[field.f_data_id];
                    //     // console.log(row, row[field.f_data_id]);
                    // }
                    tr.append(td);
                });
                if (tableTemplate.events && tableTemplate.events.length > 0) {
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
            let container = this.component;
            if (event.target.container && event.target.container === 'dialog') {
                container = this.dialog;
            }
            const param = {[event.target.name]:event.target.data_id}
            // console.log(param);
            handler(event, container, param);
        });
        this.table.addEventListener('click', event => {
            if (event.target.tagName === 'BUTTON') {
                // console.log(event);
                let container = this.component;
                if (event.target.container && event.target.container === 'dialog') {
                    container = this.dialog;
                }
                const param = {[event.target.name]:event.target.data_id}
                handler(event, container, param);
            }
        });
    }
    bindTableDataChangeEvent(handler) {
        this.table.addEventListener('keypress', event => {
            if (event.key === "Enter" && event.target.tagName === 'INPUT') {
                // console.log(event);
                const param = {[event.target.data_id]:event.target.data_val, [event.target.id]:event.target.value?parseInt(event.target.value):0}
                // console.log(param);
                this.last_modified_field_id = event.target.data_val;
                // console.log('last modified field: ', this.last_modified_field_id, this.focus_field_id);
                handler(event, param);
            }
        });
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
    bindCloseEvent(handler) {
        this.component.addEventListener('click', event => {
            // console.log('close dialog: ', event.target, event.target.name, this._inputs);
            if (event.target.name === 'close') {
                handler(this.component, this._inputs);
            }
        })
    }
    // bindSelectEvent(handler) {
    //     this.component.addEventListener('change', event => {
    //         // console.log(event.target);
    //         if (event.target.tagName === 'SELECT') {
    //             handler(this.component, this._inputs);
    //         }
    //     })
    // }
    bindDialogCloseEvent(handler) {
        this.dialog.addEventListener('close', () => {
            const param = JSON.parse(this.dialog.returnValue);
            handler();
        })
    }
}

class Controller {
    constructor(model, view){
        this.model = model;
        this.view = view;

        this.model.bindOnComponentLoad(this.onComponentLoad);
        this.onComponentLoad();

        this.view.bindDialogCloseEvent(this.onComponentLoad);
        this.model.bindonComponentDataChange(this.onComponentDataChange);
        // this.view.bindDataChangeEvent(this.handleDataChangeEvent);
        this.view.bindActionEvent(this.handleActionEvent);
        this.view.bindTableDataChangeEvent(this.handleTableDataChangeEvent);
        this.view.bindTableSortEvent(this.handleSortEvent);
        this.view.bindCloseEvent(this.handleCloseEvent);
        // this.view.bindSelectEvent(this.handleSelectEvent);
    }

    onComponentLoad = async () => {
        const component_meta = await this.model.getMeta();
        this.view.displayContent(component_meta, this.model.component_data);
    }
    onComponentDataChange = (component_meta, data, msg) => {
        this.view.displayContent(component_meta, data, msg);
    }
    handleActionEvent = (event, modal, data) => {
        // console.log('bind action: ', event, modal, data);
        this.model.actionData(event, modal, data);
    }
    handleTableDataChangeEvent = (event, data) => {
        // console.log(event.target, data);
        this.model.tableDataChange(event, data);
    }
    handleSortEvent = sortField => {
        this.model.sortData(sortField);
    }
    handleCloseEvent = (modal, data) => {
        this.model.closeModal(modal, data);
    }
    // handleSelectEvent = (modal, data) => {
    //     this.model.selectedData(modal, data);
    // }
}

