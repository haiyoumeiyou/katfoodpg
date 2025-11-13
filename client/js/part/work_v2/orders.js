import { UiHandle } from "../../module/ui_handle.js";
import { element_build } from "../../module/element_handle.js";

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
        const action = action_list.find(item => item.f_event_id === event.target.event_id);
        // console.log(action);
        if (action) {
            if (action.handler === 'json' && action.container === 'self') {
                const endpoint = await this.router.constructor.metaSectionToDataEndpoint(action.meta_section)
                // console.log(endpoint);
                const endpoint_data = await this.router.dataExchange(endpoint, param);
                const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
                this.table_data = endpoint_data[1];
                this._commit(this.table_data, endpoint_status);
            }
            if (action.handler === 'json' && action.container !== 'self') {
                const component_module = action.handler;
                const { render } = await import(component_module);
                await render(action, container, this.router);
            }
            if (action.handler === 'file') {
                const endpoint = action.f_data_endpoint;
                const endpoint_status = await this.router.fileExchange(endpoint, param);
                this._commit(this.table_data, endpoint_status);
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
    async tableData(event, container, param) {
        // console.log('view event: ', event, event.target, event.target.data_id);
        const action_list = this.section_meta.table_template.events;
        const action = action_list.find(item => item.f_event_id === event.target.event_id);
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
    get _inputs() {
        let inputs = {};
        const input_elements = this.nav_bar.querySelectorAll('input, select');
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
    set _inputs(data) {
        const input_elements = this.nav_bar.querySelectorAll('input', 'select');
        if (input_elements.length > 0) {
            input_elements.forEach(input_element => {
                // console.log(input_element.id, data['data']);
                if (input_element.id in data['data']) {
                    input_element.value = data['data'][input_element.id];
                }
            });
        }
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
    displayNavbar(navbar, input_data=null) {
        this.nav_bar.innerHTML = '';
        const display = element_build.searchBar(navbar, input_data);
        this.nav_bar.append(display);
    }
    displayTable(tableTemplate, tableData) {
        this.table.innerHTML = '';
        
        const display = element_build.tableWithEvent(tableTemplate, tableData);
        this.table.append(display);
    }
    bindNavbarEvent(handler) {
        this.nav_bar.addEventListener('click', event => {
            // console.log('navbar click event: ', event);
            if (event.target.tagName === 'BUTTON') {
                let param = this._inputs;
                let container = this.dialog;
                if (event.target.container && event.target.container === 'self') {
                    container = this.app;
                }
                handler(event, container, param);
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
    bindTableEvent(handler) {
        this.table.addEventListener('click', event => {
            if (event.target.tagName === 'BUTTON') {
                console.log(event);
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
        this.view.bindTableEvent(this.handleTableEvent);
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
    handleTableEvent = (event, container, param) => {
        this.model.tableData(event, container, param);
    }
    handleDialogCloseEvent = returnValue => {
        this.model.updateData(returnValue);
    }
}

