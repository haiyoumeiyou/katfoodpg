import { UiHandle } from "../module/ui_handle.js";

export function render(route, routeElement, appRouter) {
    const app = new Controller(new Model(route, appRouter), new View(routeElement));
    return app;
}

class Model {
    constructor(route, appRouter) {
        this.route = route;
        this.router = appRouter; 
        this.section_meta = {};
        this.table_data = [];
        this.sort_direction = null;
    }
    async bindOnRouteLoad(callback) {
        this.onRouteLoad = callback;
    }
    async getMeta() {
        this.section_meta = await this.router.getRouteMeta(this.route);
        const endpoint_data = await this.router.getRouteData(this.route);
        const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
        if (endpoint_status === 'ok'){
            this.table_data = endpoint_data[1];
        }
        return this.section_meta;
    }
    _commit(tableData, msg) {
        this.onTableDataChange(this.section_meta.table_template, tableData, msg);
    }
    async bindTableDataChange(callback) {
        this.onTableDataChange = callback;
    }
    async navbarActionData(event, container, param) {
        // console.log('navbar event model action: ', event, event.target, param);
        const action_list = this.section_meta.nav_bar;
        const action = action_list.find(item => item.f_event_id === event.target.id);
        // console.log(action, param);
        if (action) {
            if (action.handler === 'self') {
                const endpoint = await this.router.constructor.metaSectionToDataEndpoint(action.meta_section)
                // console.log(endpoint);
                const endpoint_data = await this.router.dataExchange(endpoint, param);
                const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
                this.table_data = endpoint_data[1];
                this._commit(this.table_data, endpoint_status);
            }
            if (action.handler !== 'self') {
                const component_module = action.handler;
                const { render } = await import(component_module);
                await render(action, container, this.router);
            }
        }
    }
    async sortData(sortField) {
        // console.log('sort action: ', sortField, sortField.sort);
        let sortedData = this.table_data;
        // console.log('data: ', sortedData);
        this.sort_direction = this.sort_direction=='asc'?'dsc':'asc';
        sortedData = await UiHandle.listSort(sortedData, sortField, this.sort_direction);
        this._commit(sortedData);
    }
    async updateData(returnValue) {
        const key_field = this.section_meta.table_template.table_key;
        const return_value = JSON.parse(returnValue);
        // console.log('return value: ', return_value);
        if (this.table_data.length > 0) {
            this.table_data = this.table_data.map(row => 
                row[key_field] == return_value[key_field] ? Object.assign(row, return_value) : row
            );
            const found = this.table_data.find(item => item[key_field] == return_value[key_field]);
            // console.log('found: ', found);
            if (return_value[key_field] && found === undefined) {
                this.table_data.unshift(return_value);
            }
        }
        if (this.table_data.length === 0) {
            this.table_data.push(return_value);
        }
        this._commit(this.table_data);
    }
    async actionData(event, container, param) {
        // console.log('view event: ', event, event.target, event.target.data_id);
        const action_list = this.section_meta.table_template.events;
        const action = action_list.find(item => item.f_event_id === event.target.id);
        if (action) {
            // console.log('view action: ', action);
            action.param = param;
            // console.log('view action:', action, param);
            const component_module = action.handler;
            const { render } = await import(component_module);
            await render(action, container, this.router);
        }
    }
}

class View {
    constructor(container){
        this.app = container;
        if (this.app) {
            this.app.innerHTML = '';
        }
        this.ui_handle = new UiHandle(container);
        this.title = this.ui_handle.createElement('h2');
        this.search = this.ui_handle.createElement('p');
        this.nav_bar = this.ui_handle.createElement('p');
        this.scroll_table = this.ui_handle.createElement('div', 'scroll_table');
        this.table = this.ui_handle.createElement('table');
        this.scroll_table.appendChild(this.table);
        this.dialog = this.ui_handle.createElement('dialog');
        this.app.append(this.title, this.dialog, this.nav_bar, this.scroll_table);
    }
    _resetContent() {
        this.app.innerHTML = '';
    }
    async displayContent(section_meta, table_data) {
        // this.title.textContent = sect_data.title;
        if (section_meta.demo) {
            this.title.textContent = section_meta.demo;
        } else {
            this.title.remove();
        }
        // console.log(sect_data)
        if (section_meta.nav_bar) {
            this.displayNavbar(section_meta.nav_bar);
        }
        if (section_meta.table_template) {
            this.displayTable(section_meta.table_template, table_data);
        }
    }
    displayNavbar(navbar) {
        this.nav_bar.innerHTML = '';
        navbar.forEach(nav_item => {
            const item = this.ui_handle.createElement(nav_item.f_type);
            item.textContent = nav_item.d_name;
            item.id = nav_item.f_event_id;
            item.name = nav_item.f_id;
            if (nav_item.container) {
                item.container = nav_item.container;
            }
            this.nav_bar.append(item);
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
                th.classList.add('sort');
            }
            thr.append(th);
        });
        if (tableTemplate.events && tableTemplate.events.length>0) {
            const th = this.ui_handle.createElement('th');
            th.innerText = "Action";
            thr.append(th);         
        } 
        if (tableData) {
            // console.log('table data: ', tableData);
            tableData.forEach(row => {
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
    bindNavbarEvent(handler) {
        this.nav_bar.addEventListener('click', event => {
            // console.log('navbar click event: ', event);
            if (event.target.tagName === 'BUTTON') {
                let param = null;
                const selector = `input[name=${event.target.name}]`;
                const el = this.nav_bar.querySelector(selector);
                if (el) param = {[event.target.name]:'%' + el.value + '%'}
                // console.log('nav input by button: ', el, param);
                let container = this.dialog;
                if (event.target.container && event.target.container === 'self') {
                    container = this.app;
                }
                handler(event, container, param);
            }
        });
        this.nav_bar.addEventListener('keypress', event => {
            // console.log(event);
            if ((event.key === 'Enter' || event.Key === 'Tab') && event.target.tagName === 'INPUT') {
                const param = {[event.target.name]:'%' + event.target.value + '%'}
                handler(event, this.dialog, param);
            }
        })
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
        this.table.addEventListener('click', event => {
            if (event.target.tagName === 'BUTTON') {
                let container = this.dialog;
                if (event.target.container && event.target.container === 'self') {
                    container = this.app;
                }
                const param = {[event.target.name]:event.target.data_id}
                handler(event, container, param);
            }
        })
    }
    bindDialogCloseEvent(handler) {
        this.dialog.addEventListener('close', () => {
            handler(this.dialog.returnValue);
        })
    }
}

class Controller {
    constructor(model, view){
        this.model = model;
        this.view = view;

        // this.model._init();
        this.model.bindOnRouteLoad(this.onRouteLoad);
        // this.onRouteLoad(this.model.getMeta());
        this.onRouteLoad();
        this.model.bindTableDataChange(this.onTableDataChange);

        this.view.bindNavbarEvent(this.handleNavbarEvent);
        this.view.bindTableSortEvent(this.handleSortEvent);
        this.view.bindActionEvent(this.handleActionEvent);
        this.view.bindDialogCloseEvent(this.handleDialogCloseEvent);
    }

    onRouteLoad = async () => {
        const sect_data = await this.model.getMeta();
        this.view.displayContent(sect_data, this.model.table_data);
    }
    onTableDataChange = (tableTemplate, tableData, msg) => {
        this.view.displayTable(tableTemplate, tableData, msg);
    }
    handleNavbarEvent = (event, container, param) => {
        this.model.navbarActionData(event, container, param);
    }
    handleSortEvent = sortField => {
        this.model.sortData(sortField);
    }
    handleActionEvent = (event, container, param) => {
        this.model.actionData(event, container, param);
    }
    handleDialogCloseEvent = returnValue => {
        this.model.updateData(returnValue);
    }
}

