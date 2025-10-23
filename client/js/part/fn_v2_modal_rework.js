import { UiHandle } from "../module/ui_handle.js";

export function render(componentInfo, componentElement, appRouter) {
    const component = new Controller(new Model(componentInfo, appRouter), new View(componentElement));
    return component;
}

class Model {
    constructor(componentInfo, appRouter) {
        this.componentInfo = componentInfo;
        this.router = appRouter; 
        this.component_param = {};
        this.component_meta = {};
        this.component_data = {};
        this.sort_direction = null;
    }
    async bindOnComponentLoad(callback) {
        this.onComponentLoad = callback;
    }
    async getMeta() {
        // console.log(this.componentInfo);
        const param = this.componentInfo.param ? this.componentInfo.param : {}
        this.component_param = param;
        this.component_meta = await this.router.getRouteMeta(this.componentInfo);
        const endpoint_data = await this.router.getRouteData(this.componentInfo, param);
        const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
        if (endpoint_status === 'ok'){
            this.component_data = endpoint_data[1];
            if (this.component_meta.data_params) {
                this.component_param = UiHandle.assignParamsByDictFromDataset(this.component_param, this.component_meta.data_params, this.component_data);
            }
        }
        console.log(this.component_data, this.component_param);
        return this.component_meta;
    }
    validateData(data, validation_data, validation_meta) {
        
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
    async actionbarData(event, container, data) {
        const q_param = {...this.component_param, ...data};
        // console.log(event, event.target, q_param);
        const action_list = this.component_meta.action_template.fields;
        // console.log(action_list);
        const action = action_list.find(item => item.f_event_id === event.target.event_id);
        console.log(action, this.component_meta.data_validate);
        if (action && action.f_data_validate && this.component_meta.data_validate) {
            console.log('validating...')
            for (const [k, v] of Object.entries(this.component_meta.data_validate)) {
                console.log('validating...', k, v);
                if (q_param[k] && this.component_data[v]) {
                    console.log('validating...', q_param[k], this.component_data[v]);
                    const should_continue = UiHandle[action.f_data_validate](q_param[k], this.component_data[v]);
                    console.log('validating...', should_continue);
                    if (!should_continue[0]) {
                        UiHandle.playSound(300, 'square', 500);
                        return this._commit(this.component_data, should_continue[1]);
                    }
                }
            }
        }
        if (action && action.f_data_endpoint) {
            const endpoint = action.f_data_endpoint;
            // console.log(endpoint);
            if (endpoint) {
                const endpoint_data = await this.router.dataExchange(endpoint, q_param);
                // console.log(endpoint_data);
                const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
                if (endpoint_data[0] === 'ok') {
                    const db_data = endpoint_data[1];
                    // console.log(db_data);
                    this.component_data = db_data;
                    UiHandle.playSound(440, 'sine', 100);
                }
                this._commit(this.component_data, endpoint_status);
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
        this.message = this.ui_handle.createElement('p', 'messageholder');
        this.title_sec = this.ui_handle.createElement('p');
        this.action_bar = this.ui_handle.createElement('p');
        this.scroll_table = this.ui_handle.createElement('div', 'scroll_table');
        this.table = this.ui_handle.createElement('table');
        this.scroll_table.appendChild(this.table);
        this.component.append(this.message, this.title_sec, this.action_bar, this.scroll_table);
        this._temp_selected = null;
        this._temp_search = null;
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
        if (componentMeta.title_template) {
            this.displayTitle(componentMeta.title_template, componentData.title_data);
        }
        if (componentMeta.action_template) {
            this.displayActionbar(componentMeta.action_template, componentData.action_data);
        }
        if (componentMeta.table_template) {
            this.displayTable(componentMeta.table_template, componentData.table_data);
        }

        let is_focus = true;
        this.action_bar.querySelectorAll('input').forEach((input) => {
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
    displayTitle(title_template, title_data){
        this.title_sec.innerHTML = '';
        const local_title_data = title_data[0];
        console.log(local_title_data);
        title_template.fields.forEach(title_item => {
            if (title_item.f_id in local_title_data){
                const item = this.ui_handle.createElement(title_item.f_element);
                const item_content = local_title_data[title_item.f_id];
                // console.log(item_content);
                const title_item_list = [title_item.d_name, ": ", item_content];
                item.textContent = "".concat(...title_item_list);

                this.title_sec.append(item);
            }
        });
    }
    displayActionbar(action_template, action_data) {
        this.action_bar.innerHTML = '';
        action_template.fields.forEach(act_item => {
            const p = this.ui_handle.createElement('p');
            const label = this.ui_handle.createElement('label');
            label.textContent = act_item.d_name;
            const item = this.ui_handle.createElement(act_item.f_element);
            item.id = act_item.f_id;
            item.event_id = act_item.f_event_id;
            
            p.append(label, item);
            this.action_bar.append(p);
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
                            // console.log(row, row[event.f_enable_indicator]);
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
    // bindActionEvent(handler) {
    //     // this.action_bar.addEventListener('click', event => {
    //     //     // console.log('Action dialog: ', event.target, event.target.name, this._inputs);
    //     //     handler(event, this.component, this._inputs);
    //     // });
    //     this.table.addEventListener('click', event => {
    //         if (event.target.tagName === 'BUTTON') {
    //             // console.log(event.parent);
    //             const param = {[event.target.name]:event.target.data_id}
    //             handler(event, this.component, param);
    //         }
    //     });
    // }
    bindActionbarEvent(handler) {
        // this.action_bar.addEventListener('change', event => {
        //     // console.log(event.target);
        //     if (event.target.tagName === 'SELECT') {
        //         this._temp_selected = { [event.target.id]:event.target.value};
        //         handler(event, this.component, this._inputs);
        //     }
        // });
        this.action_bar.addEventListener('keypress', event => {
            // console.log(event.target);
            if ((event.key === 'Enter') && event.target.tagName === 'INPUT') {
                handler(event, this.component, this._inputs);
            }
        });
        this.action_bar.addEventListener('click', event => {
            if (event.target.tagName === 'BUTTON') {
                // console.log(event.parent);
                handler(event, this.component, null);
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
        // this.view.bindActionEvent(this.handleActionEvent);
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
    // handleActionEvent = (event, modal, data) => {
    //     this.model.actionData(event, modal, data);
    // }
    handleActionbarEvent = (event, container, data) => {
        this.model.actionbarData(event, container, data);
    }
    handleCloseEvent = (modal, data) => {
        this.model.closeModal(modal, data);
    }
}

