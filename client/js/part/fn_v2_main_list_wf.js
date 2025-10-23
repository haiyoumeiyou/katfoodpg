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
        this.component_param = {};
        this.component_meta = {};
        this.component_data = {};
        this.sort_direction = null;
    }
    async bindOnComponentLoad(callback) {
        this.onComponentLoad = callback;
    }
    async getMeta() {
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
    async _commit(data, msg) {
        this.onComponentDataChange(this.component_meta, data, msg);
    }
    bindonComponentDataChange(callback) {
        this.onComponentDataChange = callback;
    }
    async actionData(event, modal, data) {
        let action_data
        const action_list = [...this.component_meta.list_template.events];
        console.log('modal data when action xecute: ', event, modal, data, action_list, this.component_meta);
        const action = action_list.find(item => item.f_event_id === event.target.event_id);
        if (data['action_eid']) {
            action_data = this.component_data[this.component_meta.list_template.data_source].find(item => item.eid === data['action_eid'])
            // const q_param = {...q_param, ...action_data};
        }
        const q_param = {...this.component_param, ...data, ...action_data};
        console.log(action, q_param);
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
            } else {
                action.param = q_param;
                // console.log('view action:', action);
                // const action_handle = data.action_handle;
                // const meta_section = action.meta_section[action_handle];
                // action.meta_section = meta_section;
                const component_module = action.handler;
                // console.log(action, action_handle, component_module);
                const { render } = await import(component_module);
                await render(action, modal, this.router);
            }
        }
    }
    // async sortData(sortField) {
    //     // console.log('sort action: ', sortField, sortField.sort);
    //     let sortedData = this.component_data.table_data;
    //     // console.log('data: ', sortedData);
    //     this.sort_direction = this.sort_direction=='asc'?'dsc':'asc';
    //     sortedData = await UiHandle.listSort(sortedData, sortField, this.sort_direction);
    //     this.component_data.table_data = sortedData;
    //     this._commit(this.component_data);
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
        this.list = this.ui_handle.createElement('ul');
        this.title_sec = this.ui_handle.createElement('p');
        this.action_sec = this.ui_handle.createElement('p');
        this.dialog = this.ui_handle.createElement('dialog');
        this.component.append(this.message, this.title_sec, this.dialog, this.action_sec, this.list);
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
        if (componentMeta.title_template, componentData) {
            this.displayTitlebar(componentMeta.title_template, componentData);
        }
        if (componentMeta.action_template) {
            this.displayActionbar(componentMeta.action_template, componentData);
        }
        if (componentMeta.list_template) {
            this.displayList(componentMeta.list_template, componentData);
        }
        if (msg) {
            let css_class = ['alert'];
            if (msg.startsWith('ko')) {
                css_class.push('danger');
            }
            // console.log(css_class);
            this.message.innerHTML = '';
            this.ui_handle.alertMessage(msg, this.message, css_class.join(' '), 9000);
        }
        // let is_focus = true;
        // this.table.querySelectorAll('input').forEach((input) => {
        //     if (is_focus && input.value === '') {
        //         input.focus();
        //         is_focus = false;
        //     }
        // });
    }
    displayTitlebar(titleTemplate, componentData) {
        this.title_sec.innerHTML = '';
        if (titleTemplate.fields && titleTemplate.fields.length > 0) {
            titleTemplate.fields.forEach(field => {
                const item = this.ui_handle.createElement(field.f_element);
                let item_text = field.d_name
                if (titleTemplate.data_source) {
                    if (titleTemplate.data_source == 'local') {
                        item_text = item_text.concat(': ', field.f_text);
                    }
                    if (titleTemplate.data_source == 'localStorage') {
                        item_text = item_text.concat(': ', localStorage.getItem(field.f_id));
                    }
                    // if (titleTemplate.data_source.endswith('_data')) {
                    //     item.textContent = componentData[titleTemplate.data_source][0][field.f_id];
                    // }
                }
                item.textContent = item_text;
                this.title_sec.appendChild(item);
            });
        }
    }
    displayActionbar(actionTmplate, componentData) {
        this.action_sec.innerHTML = '';
        const p = this.ui_handle.createElement('p');
        this.action_sec.append(p);
        actionTmplate.fields.forEach(act_item => {
            // const label = this.ui_handle.createElement('label');
            // label.textContent = act_item.d_name;
            const item = this.ui_handle.createElement(act_item.f_element);
            item.id = act_item.f_id;
            item.data_id = act_item.f_id;
            item.event_id = act_item.f_event_id;
            item.textContent = act_item.d_name;
            if (act_item.container) {
                item.container = act_item.container;
            }
            
            p.append(item);
        });
    }
    displayList(listTemplate, componentData) {
        this.list.innerHTML = '';
        
        if (listTemplate.data_source && componentData[listTemplate.data_source] && componentData[listTemplate.data_source].length > 0) {
            componentData[listTemplate.data_source].forEach(row => {
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

                this.list.append(li);
            });
        }
    }
    bindActionEvent(handler) {
        this.action_sec.addEventListener('click', event => {
            console.log('Action dialog: ', event.target, event.target.name, this._inputs);
            let container = this.component;
            if (event.target.tagName === 'BUTTON') {
                if (event.target.container && event.target.container === 'dialog') {
                    container = this.dialog;
                }
                handler(event, container, this._inputs);
            }
        });
        this.list.addEventListener('click', event => {
            if (event.target.tagName === 'BUTTON') {
                // console.log(event);
                let container = this.component;
                if (event.target.container && event.target.container === 'dialog') {
                    container = this.dialog;
                }
                const action_data = {"action_eid": event.target.data_id};
                handler(event, container, action_data);
            }
        });
    }
    // bindTableSortEvent(handler) {
    //     this.table.addEventListener('click', event => {
    //         // console.log('table click event: ', event);
    //         if (event.target.sort) {
    //             // console.log('sorting event:', event.target.sort);
    //             handler(event.target);
    //         }
    //     })
    // }
    bindCloseEvent(handler) {
        this.component.addEventListener('click', event => {
            // console.log('close dialog: ', event.target, event.target.name, this._inputs);
            if (event.target.name === 'close') {
                handler(this.component, this._inputs);
            }
        })
    }
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
        // this.view.bindTableSortEvent(this.handleSortEvent);
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
    // handleSortEvent = sortField => {
    //     this.model.sortData(sortField);
    // }
    handleCloseEvent = (modal, data) => {
        this.model.closeModal(modal, data);
    }
}

