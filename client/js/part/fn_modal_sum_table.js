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
        const param = this.componentInfo.param ? this.componentInfo.param : {}
        // console.log(param);
        this.component_data.param = param;
        const endpoint_data = await this.router.getRouteData(this.componentInfo, param);
        const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
        if (endpoint_status === 'ok'){
            this.component_data.table_data = endpoint_data[1];
        }
        const title_endpoint = this.component_meta.title_template ? this.component_meta.title_template.f_data : null;
        const title_data = await this.router.dataExchange(title_endpoint, param);
        // console.log(title_data);
        this.component_data.title_data = title_data[1][0];
        // this.component_select_options = await this.getSelectOptions(this.component_meta.modal_template.fields);
        const summ_endpoint = this.component_meta.summ_template ? this.component_meta.summ_template.template_data : null;
        const summ_data = await this.router.dataExchange(summ_endpoint, param);
        // console.log(summ_data);
        this.component_data.summ_data = summ_data[1];
        return this.component_meta;
    }
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
        // console.log(action_list, action);
        if (action) {
            if (action.handler === 'self') {
                if ('meta_section' in action) {
                    const endpoint = await this.router.constructor.metaSectionToDataEndpoint(action.meta_section)
                    console.log(endpoint, q_param);
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
                if ('f_action_endpoint' in action) {
                    const endpoint = action.f_action_endpoint;
                    console.log(endpoint, q_param);
                    if (endpoint) {
                        const endpoint_data = await this.router.dataExchange(endpoint, q_param);
                        const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
                        if (endpoint_data[0] === 'ok') {
                            const db_data = endpoint_data[1];
                            console.log(db_data);
                            // this.component_data.table_data = db_data;
                        }
                        this._commit(this.component_data, endpoint_status);
                    }
                }
            } else {
                action.param = data;
                // console.log('view action:', action);
                const component_module = action.handler;
                const { render } = await import(component_module);
                await render(action, modal, this.router);
            }
        }
    }
    closeModal(modal) {
        // console.log('modal data when close: ', data);
        modal.returnValue = JSON.stringify({});
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
        this.scroll_table = this.ui_handle.createElement('div', 'scroll_table');
        this.table = this.ui_handle.createElement('table');
        this.scroll_table.appendChild(this.table);
        this.title_bar = this.ui_handle.createElement('p');
        this.action_bar = this.ui_handle.createElement('p');
        this.summ_table = this.ui_handle.createElement('table');
        this.component.append(this.title_bar, this.summ_table, this.action_bar, this.scroll_table);
    }
    _resetContent() {
        this.component.innerHTML = '';
    }
    async displayContent(componentMeta, componentData, msg) {
        // console.log(componentData);
        if (componentMeta.title_template&&'title_data' in componentData) {
            this.displayTitlebar(componentMeta.title_template, componentData.title_data);
        }
        if (componentMeta.summ_template&&'summ_data' in componentData) {
            this.displaySummTable(componentMeta.summ_template, componentData.summ_data);
        }
        if (componentMeta.action_bar) {
            this.displayActionbar(componentMeta.action_bar, componentData);
        }
        if (componentMeta.table_template) {
            this.displayTable(componentMeta.table_template, componentData.table_data);
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
    displaySummTable(summTemplate, summData) {
        // console.log(summData);
        this.summ_table.innerHTML = '';
        const head = this.ui_handle.createElement('thead');
        const thr = this.ui_handle.createElement('tr');
        const body = this.ui_handle.createElement('tbody');
        head.appendChild(thr);

        this.summ_table.append(head, body);
        summTemplate.fields.forEach(field => {
            const th = this.ui_handle.createElement('th');
            th.innerText = field.d_name;
            thr.append(th);
        });
        if (summData) {
            summData.forEach(row => {
                const tr = this.ui_handle.createElement('tr');
                summTemplate.fields.forEach(field => {
                    const td = this.ui_handle.createElement('td');
                    td.innerText = row[field.f_id]?row[field.f_id]:'';
                    td.id = field.f_id;
                    tr.append(td);
                });
                body.append(tr);
            });
        }
    }
    displayActionbar(actionbar, componentData) {
        this.action_bar.innerHTML = '';
        actionbar.forEach(nav_item => {
            const item = this.ui_handle.createElement(nav_item.f_type);
            item.textContent = nav_item.d_name;
            item.id = nav_item.f_event_id;
            item.name = nav_item.f_id;
            if (nav_item.container) {
                item.container = nav_item.container;
            }
            if (componentData.param && nav_item.f_id in componentData.param) {
                // console.log(componentData.param);
                item.data_id = componentData.param[nav_item.f_id];
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
        if (tableData) {
            let calc_hold = 0;
            tableData.forEach(row => {
                const tr = this.ui_handle.createElement('tr');
                tableTemplate.fields.forEach(field => {
                    const td = this.ui_handle.createElement('td');
                    td.innerText = row[field.f_id]?row[field.f_id]:'';
                    td.id = field.f_id;
                    if (field.f_edit) {
                        td.contentEditable = true;
                    }
                    if (field.f_data_id && row[field.f_data_id]) {
                        td.data_id = field.f_data_id;
                        td.data_val = row[field.f_data_id];
                        // console.log(row, row[field.f_data_id]);
                    }
                    if (field.f_formula) {
                        for (const [k, v] of Object.entries(field.f_formula_fields)) {
                            if (row[k]) {
                                calc_hold = UiHandle[field.f_formula](calc_hold, row[k], v);
                            }
                        }
                        // field.f_formula_fields.forEach(calc_field => {
                        //     if (row[calc_field]) {
                        //         calc_hold = UiHandle[field.f_formula](calc_hold, row[calc_field], calc_field);
                        //     }
                        // });
                        td.innerText = calc_hold;
                    }
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
            handler(event, container, param);
        });
    }
    bindCloseEvent(handler) {
        this.component.addEventListener('click', event => {
            // console.log('close dialog: ', event.target, event.target.name, this._inputs);
            if (event.target.name === 'close') {
                handler(this.component);
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

        this.model.bindonComponentDataChange(this.onComponentDataChange);
        // this.view.bindDataChangeEvent(this.handleDataChangeEvent);
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
        // console.log('bind action: ', event, modal, data);
        this.model.actionData(event, modal, data);
    }
    handleCloseEvent = (modal) => {
        this.model.closeModal(modal);
    }
}

