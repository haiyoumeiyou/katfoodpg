import { UiHandle } from "../module/ui_handle.js";

export function render(componentInfo, componentElement, appRouter) {
    const component = new Controller(new Model(componentInfo, appRouter));
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
    async bindOnComponentLoad(callback) {
        this.onComponentLoad = callback;
    }
    async getComponentData(endpoint, param) {
        const endpoint_rst = await this.router.dataExchange(endpoint, param);
        const endpoint_status = endpoint_rst[0] === 'ok' ? endpoint_rst[0] : endpoint_rst.join(', ');
        if (endpoint_rst[0] === 'ok') {
            this.component_data = endpoint_rst[1];
        }
        // console.log(param, endpoint_rst);
        return {"data":this.component_data, "status":endpoint_status};
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
                    // console.log('no local param');
                    return {"meta":this.component_meta, "status":"local data not found, please inform supervisor !!!"};
                }
                q_param = {...local_params, ...this.componentInfo.param?this.componentInfo.param:{}};
            }
        }
        this.component_meta.param = q_param;
        const d_endpoint = await this.router.constructor.metaSectionToDataEndpoint(this.componentInfo.meta_section);
        return this.getComponentData(d_endpoint, q_param);
    }
    async dispatch() {
        const _componentInfo = await this.getMeta();
        // console.log(_componentInfo);
        if ('dispatch_template' in this.component_meta
        && _componentInfo.status == 'ok' 
        && this.component_meta.dispatch_template.data_source in _componentInfo.data 
        && _componentInfo.data[this.component_meta.dispatch_template.data_source].length > 0) {

            const fields = this.component_meta.dispatch_template.fields;
            const fields_data = _componentInfo.data[this.component_meta.dispatch_template.data_source][0];

            const dispatch_data = {}
            fields.forEach(field => {
                dispatch_data[field.f_id] = fields_data[field.f_id]?fields_data[field.f_id]:field.f_default;
                // console.log(field, dispatch_data[field.f_id]);
            });
            // console.log(fields, fields_data, dispatch_data);
            if (dispatch_data['data_handle']) {
                // console.log(dispatch_data['data_handle']);
                window.location.href = dispatch_data['data_handle'];
            }
        }
    }
}

class Controller {
    constructor(model){
        this.model = model;

        this.model.bindOnComponentLoad(this.onComponentLoad);
        this.onComponentLoad();
    }

    onComponentLoad = async () => {
        await this.model.dispatch();
    }
}

