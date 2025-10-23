import { UiHandle } from "../module/ui_handle.js";

export function render(route, routeElement, appRouter) {
    const app = new Controller(new Model(route, appRouter), new View(routeElement));
    return app;
}

class Model {
    constructor(route, appRouter) {
        this.route = route;
        this.router = appRouter; 
        this.component_meta = {};
        this.component_data = {};
        this.sort_direction = null;
    }
    async bindOnRouteLoad(callback) {
        this.onRouteLoad = callback;
    }
    async getMeta() {
        this.component_meta = await this.router.getRouteMeta(this.route);
        // console.log(this.component_meta, this.route);
        if ('param' in this.route) {
            const q_param = this.route.param;
            await this.getPageData(q_param);
        }
        return this.component_meta;
    }
    _commit(componentData, msg) {
        this.onDataChange(this.component_meta, componentData, msg);
    }
    async bindDataChange(callback) {
        this.onDataChange = callback;
    }
    async getPageData(param) {
        const endpoint = await this.router.constructor.metaSectionToDataEndpoint(this.route.meta_section);
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
            captionData['data_count'] = this.component_data.table_data.length;
            this.component_data.caption_data = captionData;
        }
        this._commit(this.component_data, endpoint_status);
    }
    async navbarActionData(event, container, param) {
        // console.log('navbar event model action: ', event, event.target);
        // console.log(param);
        const param_key = this.component_meta.table_template.table_key;
        // const d_param = {[param_key.k_name]:param[param_key.k_val]};
        const action_list = this.component_meta.nav_bar;
        const action = action_list.find(item => item.f_event_id === event.target.id);
        if (action && action.container == 'dialog') {
            // console.log(container, param);
            await this.getPageData(param);

            action.param = param;
            const component_module = action.handler;
            const { render } = await import(component_module);
            await render(action, container, this.router);
        }
        if (action.handler == 'file' && action.container == 'self') {
            // const endpoint = action.f_data;
            console.log(action);
            const endpoint = await this.router.constructor.metaSectionToDataEndpoint(action.meta_section);
            let q_param = this.route.param;
            if ('f_data_key' in action && 'f_data_val' in action) {
                q_param[action.f_data_val] = this.component_data[action.f_data_key][action.f_data_val];
            }
            // console.log(endpoint, q_param);
            const endpoint_status = await this.router.fileExchange(endpoint, q_param);
            this._commit(this.component_data, endpoint_status);
        }
    }
    async sortData(sortField) {
        // console.log('sort action: ', sortField, sortField.sort);
        let sortedData = this.component_data.data_list ? this.component_data.data_list : [];
        // console.log('data: ', sortedData);
        this.sort_direction = this.sort_direction=='asc'?'dsc':'asc';
        sortedData = await UiHandle.listSort(sortedData, sortField, this.sort_direction);
        this._commit(sortedData);
    }
    async updateData(returnValue) {
        const return_value = JSON.parse(returnValue);
        await this.getPageData(return_value);
        // console.log(return_value);
    }
}

class View {
    constructor(container){
        this.component = container;
        if (this.component) {
            this.component.innerHTML = '';
        }
        this.ui_handle = new UiHandle(container);
        this.title = this.ui_handle.createElement('h2');
        // this.search = this.ui_handle.createElement('p');
        this.nav_bar = this.ui_handle.createElement('p');
        this.scroll_table = this.ui_handle.createElement('div', 'scroll_table');
        this.table = this.ui_handle.createElement('table');
        this.scroll_table.appendChild(this.table);
        this.dialog = this.ui_handle.createElement('dialog');
        this.component.append(this.dialog, this.nav_bar, this.title, this.scroll_table);
    }
    _resetContent() {
        this.component.innerHTML = '';
    }
    async displayContent(componentMeta, componentData) {
        // console.log(componentMeta, componentData);
        if (componentMeta.nav_bar) {
            this.displayNavbar(componentMeta.nav_bar);
        }
        if ('caption_data' in componentData && componentMeta.table_template.caption) {
            this.displayTitle(componentMeta.table_template.caption, componentData.caption_data);
        }
        if ('table_data' in componentData) {
            // componentMeta.table_template.fields = componentData.column_data;
            // const tableData = await this.ui_handle.constructor.pivotData(componentData.table_data, 'assm_serial', 'assm_conf_id', 'part_sn');
            this.displayTable(componentMeta.table_template, componentData.table_data);
        }
        let is_focus = true;
        this.nav_bar.querySelectorAll('input').forEach((input) => {
            if (is_focus && input.value === '') {
                input.focus();
                is_focus = false;
            }
        });
    }
    displayNavbar(navbar) {
        this.nav_bar.innerHTML = '';
        navbar.forEach(nav_item => {
            const item = this.ui_handle.createElement(nav_item.f_type);
            item.textContent = nav_item.d_name;
            item.id = nav_item.f_event_id;
            item.name = nav_item.f_id;
            if ('css_class' in nav_item) {
                item.classList.add(nav_item.css_class);
            }
            this.nav_bar.append(item);
        });
    }
    displayTitle(captionMeta, captionData) {
        // console.log(captionMeta);
        this.title.innerHTML = '';
        if (captionData) {
            const caption_data = captionData;
            captionMeta.forEach(field => {
                if (field.f_id in caption_data) {
                    const label = this.ui_handle.createElement('label');
                    label.textContent = field.d_name + ': ' + caption_data[field.f_id] + ', ';
                    this.title.append(label);
                }
            });
        }
    }
    displayTable(tableTemplate, tableData) {
        this.table.innerHTML = '';
        
        // console.log(tableData);
        const fields_attr = tableTemplate.fields_attr;
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
            tableData.forEach(row => {
                // console.log(row);
                const tr = this.ui_handle.createElement('tr');
                tableTemplate.fields.forEach(field => {
                    const td = this.ui_handle.createElement('td');
                    // console.log(field[fields_attr.f_data_val], row[field[fields_attr.f_data_val]]);
                    td.innerText = row[field.f_id]?row[field.f_id]:'';
                    if (field.f_css_class) {
                        td.classList.add(field.f_css_class);
                    }
                    // console.log(td.innerText);
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
                if (el) param = {[event.target.name]:el.value}
                // console.log('nav input by button: ', el, param);
                handler(event, this.dialog, param);
            }
        });
        this.nav_bar.addEventListener('keypress', event => {
            // console.log(event);
            if ((event.key === 'Enter' || event.Key === 'Tab') && event.target.tagName === 'INPUT') {
                const param = {[event.target.name]:event.target.value}
                handler(event, this.dialog, param);
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

        this.model.bindOnRouteLoad(this.onRouteLoad);
        // this.onRouteLoad(this.model.getMeta());
        this.onRouteLoad();
        this.model.bindDataChange(this.onDataChange);

        this.view.bindNavbarEvent(this.handleNavbarEvent);
        // this.view.bindTableSortEvent(this.handleSortEvent);
        // this.view.bindActionEvent(this.handleActionEvent);
        this.view.bindDialogCloseEvent(this.handleDialogCloseEvent);
    }

    onRouteLoad = async () => {
        const sect_data = await this.model.getMeta();
        this.view.displayContent(sect_data, this.model.component_data);
    }
    onDataChange = (componentMeta, componentData, msg) => {
        this.view.displayContent(componentMeta, componentData, msg);
    }
    handleNavbarEvent = (event, container, param) => {
        this.model.navbarActionData(event, container, param);
    }
    // handleSortEvent = sortField => {
    //     this.model.sortData(sortField);
    // }
    // handleActionEvent = (event, container, param) => {
    //     this.model.actionData(event, container, param);
    // }
    handleDialogCloseEvent = returnValue => {
        this.model.updateData(returnValue);
    }
}

