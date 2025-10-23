import { UiHandle } from "../module/ui_handle.js";
import { element_build } from "../module/element_handle.js";

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
    }
    // async bindOnComponentLoad(callback) {
    //     this.onComponentLoad = callback;
    // }
    async getComponentData(endpoint, param) {
        const endpoint_rst = await this.router.dataExchange(endpoint, param);
        const endpoint_status = endpoint_rst[0] === 'ok' ? endpoint_rst[0] : endpoint_rst.join(', ');
        if (endpoint_rst[0] === 'ok') {
            this.component_data = endpoint_rst[1];
        }
        // console.log(param, endpoint_rst);
        return {meta:this.component_meta, data:this.component_data, status:endpoint_status};
    }
    async getMeta() {
        this.component_meta = await this.router.getRouteMeta(this.componentInfo);
        let q_param = {};
        if ("component_setup" in this.component_meta) {
            if ("local_data" in this.component_meta.component_setup && this.component_meta.component_setup.local_data == "localStorage") {
                let local_params = {};
                const local_key = this.component_meta.component_setup.local_data_key?this.component_meta.component_setup.local_data_key:null;
                if (local_key) {
                    local_key.forEach(key_pair => {
                        local_params[key_pair['f_id']] = UiHandle.getLocalStorageItem(key_pair['local_key']);
                    });
                }
                if (!local_params) {
                    console.log('no local param');
                    return {"meta":this.component_meta, "status":"local station data not found, please inform supervisor !!!"};
                }
                q_param = {...local_params, ...this.componentInfo.param?this.componentInfo.param:{}};
            }
        }
        this.component_meta.param = q_param;
        // console.log(this.component_meta.param);
        const d_endpoint = await this.router.constructor.metaSectionToDataEndpoint(this.componentInfo.meta_section);
        return this.getComponentData(d_endpoint, q_param);
    }
    // async _commit(data, msg) {
    //     this.onComponentDataChange(this.component_meta, data, msg);
    // }
    // bindonComponentDataChange(callback) {
    //     this.onComponentDataChange = callback;
    // }
    async refreshData() {
        const d_endpoint = await this.router.constructor.metaSectionToDataEndpoint(this.componentInfo.meta_section);
        // const rst = this.getComponentData(d_endpoint, this.component_meta.param);
        // this._commit(this.component_data, endpoint_status);
        // return {meta:this.component_meta, data:this.component_data, status:(await rst).status};
        return this.getComponentData(d_endpoint, this.component_meta.param);
    }
}

class View {
    constructor(container){
        this.component = container;
        if (this.component) {
            this.component.innerHTML = '';
        }
        this.message = element_build.element('p', 'messageholder');
        this.title_sec = element_build.element('p');
        this.card_sec = element_build.element('p');
        this.dialog = element_build.element('dialog');
        this.component.append(this.message, this.title_sec, this.dialog, this.card_sec);
    }
    _resetContent() {
        this.component.innerHTML = '';
    }
    async displayContent(componentMeta, componentData, msg) {
        // console.log(componentMeta);
        if (componentMeta.title_template) {
            this.displayTitlebar(componentMeta.title_template, componentData);
        }
        if (componentMeta.card_template) {
            this.displayCard(componentMeta.card_template, componentData);
        }
        if (msg) {
            let css_class = ['alert'];
            if (msg.startsWith('ko')) {
                css_class.push('danger');
            }
            // console.log(css_class);
            this.message.innerHTML = '';
            element_build.alertMessage(msg, this.message, css_class.join(' '), 9000);
        }
    }
    displayTitlebar(titleTemplate, componentData) {
        this.title_sec.innerHTML = '';
        // console.log(titleTemplate, componentData);
        const config = titleTemplate.fields;
        const data = componentData[titleTemplate.data_source][0]?componentData[titleTemplate.data_source][0]:{};
        console.log(config, data);
        this.title_sec.append(element_build.titleGrid(config, data));
        // if (titleTemplate.fields && titleTemplate.fields.length > 0) {
        //     titleTemplate.fields.forEach(field => {
        //         const item = element_build.element(field.f_element);
        //         let item_text = field.d_name
        //         if (titleTemplate.data_source) {
        //             if (titleTemplate.data_source == 'local') {
        //                 item_text = item_text.concat(': ', field.f_text);
        //             }
        //             if (titleTemplate.data_source == 'localStorage') {
        //                 item_text = item_text.concat(': ', localStorage.getItem(field.f_id));
        //             }
        //         }
        //         item.textContent = item_text;
        //         this.title_sec.append(item);
        //     });
        // }
    }
    displayCard(cardTemplate, componentData) {
        this.card_sec.innerHTML = '';
        const config = cardTemplate.fields;
        const data = componentData[cardTemplate.data_source];
        this.card_sec.append(element_build.tableGrid(config, data));
    }
    
}

class Controller {
    constructor(model, view){
        this.model = model;
        this.view = view;

        // this.model.bindOnComponentLoad(this.onComponentLoad);
        this.onComponentLoad();

        // this.model.bindonComponentDataChange(this.onComponentDataChange);
        setInterval(()=>{
            this.onComponentRefresh();
        }, 30000);
    }

    onComponentLoad = async () => {
        const data = await this.model.getMeta();
        this.view.displayContent(data.meta, data.data, data.status);
    }
    onComponentRefresh = async () => {
        const refreshed_data = await this.model.refreshData();
        // console.log(refreshed_data);
        this.view.displayContent(refreshed_data.meta, refreshed_data.data, refreshed_data.status);
    }
    // onComponentDataChange = (component_meta, data, msg) => {
    //     this.view.displayContent(component_meta, data, msg);
    // }
}

