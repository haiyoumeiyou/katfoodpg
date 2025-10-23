import { UiHandle } from "../module/ui_handle.js";
import { GraphHandle, graphics } from "../module/graph_handle.js";
import { BarChart } from "../module/chart_handle.js";
import { datamanipulator } from "../module/data_handle.js";

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
        // console.log(this.component_data, this.component_param);
        return this.component_meta;
    }
    async _commit(data, msg) {
        this.onComponentDataChange(this.component_meta, data, msg);
    }
    bindonComponentDataChange(callback) {
        this.onComponentDataChange = callback;
    }
    async refeshData() {
        const endpoint_data = await this.router.getRouteData(this.componentInfo, this.component_param);
        const endpoint_status = endpoint_data[0] === 'ok' ? endpoint_data[0] : endpoint_data.join(', ');
        if (endpoint_status === 'ok'){
            this.component_data = endpoint_data[1];
            if (this.component_meta.data_params) {
                this.component_param = UiHandle.assignParamsByDictFromDataset(this.component_param, this.component_meta.data_params, this.component_data);
            }
        }
        // this._commit(this.component_data, endpoint_status);
        return {meta:this.component_meta, data:this.component_data, status:endpoint_status};
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
        this.gph_handle = new GraphHandle();
        this.message = this.ui_handle.createElement('p', 'messageholder');
        this.title_sec = this.ui_handle.createElement('p');
        this.card_sec = this.ui_handle.createElement('p');
        this.dialog = this.ui_handle.createElement('dialog');
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
            this.ui_handle.alertMessage(msg, this.message, css_class.join(' '), 9000);
        }
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
                }
                item.textContent = item_text;
                this.title_sec.append(item);
            });
        }
    }
    displayCard(cardTemplate, componentData) {
        this.card_sec.innerHTML = '';
        const div = this.ui_handle.createElement('div', 'flex_container');
        this.card_sec.append(div);
        let grp_div = {};
        
        if (cardTemplate.data_source && componentData[cardTemplate.data_source] && componentData[cardTemplate.data_source].length > 0) {
            let grp_headers = [];
            let car_headers = [];
            let car_contents = [];
            const samples_dict = datamanipulator.groupArrayToDictByKeyField(componentData[cardTemplate.data_source], 'line_id', 'step_sq', 'scan_count');
            // console.log(samples_dict);

            cardTemplate.fields.forEach(field => {
                if (field.f_placement == 'grp_header') grp_headers.push(field);
                if (field.f_placement == 'car_header') car_headers.push(field);
                if (field.f_placement == 'car_content') car_contents.push(field);
            });
            // console.log(grp_headers, car_headers, car_contents);

            for (const [k, v] of Object.entries(samples_dict)) {
                grp_div[k] = this.ui_handle.createElement('div', 'card');

                const grp_header = this.ui_handle.createElement('div', 'container');
                grp_headers.forEach(field => {
                    if (v[field.f_id]) {
                        const header_field = this.ui_handle.createElement(field.f_element);
                        header_field.textContent = v[field.f_id];
                        grp_header.append(header_field);
                    }
                });
                grp_div[k].append(grp_header);

                // console.log(graphics.calcCanvasSize(div), GraphHandle.calcCanvasSize(div));
                if (cardTemplate.chart_template) {
                    const chart_template = cardTemplate.chart_template;
                    let chart_data = chart_template.static;

                    // console.log(chart_template);
                    if (chart_template.variable_num) {
                        for (const [k, v] of Object.entries(chart_template.variable_num)) {
                            chart_data[k] = parseInt(v);
                        }
                    }
                    if (chart_template.variable_key) {
                        for (const [k, v_k] of Object.entries(chart_template.variable_key)) {
                            chart_data[k] = v[v_k];
                        }
                    }
                    if (chart_template.variable_calc) {
                        for (const [k, v_k] of Object.entries(chart_template.variable_calc)) {
                            chart_data[k] = GraphHandle[v_k](div);
                            // console.log(chart_data);
                        }
                    }
                    // console.log(chart_data);
                    const myBarChart = new BarChart(grp_div[k], v['grouped_data'], chart_data);
                    
                    div.append(grp_div[k]);
                }

                // const myBarChart = new BarChart(
                //     grp_div[k],
                //     v['grouped_data'],
                //     {
                //         seriesName: v['order_title'],
                //         maxValue: v['order_count'],
                //         size: GraphHandle.calcCanvasSize(div),
                //         padding: 20,
                //         gridScale: 5,
                //         gridColor: "black",
                //         colors: ["red", "orange", "yellow", "green", "cyan", "blue", "purple"],
                //         titleOptions: {
                //             align: "center",
                //             fill: "black",
                //             font: {
                //                 weight: "bold",
                //                 size: "18px",
                //                 family: "Lato"
                //             }
                //         }
                //     });
                
                // div.append(grp_div[k]);
            }
        }
    }
    // displayCard(cardTemplate, componentData) {
    //     this.card_sec.innerHTML = '';
    //     const div = this.ui_handle.createElement('div', 'flex_container');
    //     this.card_sec.append(div);
    //     let grp_div = {};
        
    //     if (cardTemplate.data_source && componentData[cardTemplate.data_source] && componentData[cardTemplate.data_source].length > 0) {
    //         let grp_headers = [];
    //         let car_headers = [];
    //         let car_contents = [];

    //         cardTemplate.fields.forEach(field => {
    //             if (field.f_placement == 'grp_header') grp_headers.push(field);
    //             if (field.f_placement == 'car_header') car_headers.push(field);
    //             if (field.f_placement == 'car_content') car_contents.push(field);
    //         });
    //         console.log(grp_headers, car_headers, car_contents);

    //         componentData[cardTemplate.data_source].forEach(row => {
                
    //             console.log(row[cardTemplate.group_key.key]);
    //             if (!grp_div[row[cardTemplate.group_key.key]]) {
    //                 grp_div[row[cardTemplate.group_key.key]] = this.ui_handle.createElement('div', cardTemplate.group_key.css_class?cardTemplate.group_key.css_class:'card');
    //                 const grp_header = this.ui_handle.createElement('div', 'container');
    //                 grp_headers.forEach(field => {
    //                     if (row[field.f_id]) {
    //                         const header_field = this.ui_handle.createElement(field.f_element);
    //                         header_field.textContent = row[field.f_id];
    //                         grp_header.append(header_field);
    //                     }
    //                 });
    //                 grp_div[row[cardTemplate.group_key.key]].append(grp_header);
    //                 const c = this.gph_handle.createCanvas();
    //                 this.gph_handle.drawBar(c, 0, 0, 80, 80, 'green');
    //                 grp_div[row[cardTemplate.group_key.key]].append(c);
    //                 div.append(grp_div[row[cardTemplate.group_key.key]]);
    //             }

    //             const card = this.ui_handle.createElement('div', 'card');
    //             const car_header = this.ui_handle.createElement('div', 'container')
    //             car_headers.forEach(field => {
    //                 if (row[field.f_id]) {
    //                     const header_field = this.ui_handle.createElement(field.f_element);
    //                     header_field.textContent = row[field.f_id];
    //                     car_header.append(header_field);
    //                 }
    //             });

    //             const car_content = this.ui_handle.createElement('div', 'container')
    //             car_contents.forEach(field => {
    //                 if (row[field.f_id]) {
    //                     const content_field = this.ui_handle.createElement(field.f_element);
    //                     content_field.textContent = row[field.f_id];
    //                     car_content.append(content_field);
    //                 }
    //             });
                
    //             card.append(car_header, car_content);
    //             grp_div[row[cardTemplate.group_key.key]].append(card);

    //             console.log(grp_div);

    //         });
    //     }
    // }
}

class Controller {
    constructor(model, view){
        this.model = model;
        this.view = view;

        this.model.bindOnComponentLoad(this.onComponentLoad);
        this.onComponentLoad();

        // this.model.bindonComponentDataChange(this.onComponentDataChange);
        setInterval(()=>{
            this.onComponentRefresh();
        }, 30000);
    }

    onComponentLoad = async () => {
        const component_meta = await this.model.getMeta();
        this.view.displayContent(component_meta, this.model.component_data);
    }
    onComponentDataChange = (component_meta, data, msg) => {
        this.view.displayContent(component_meta, data, msg);
    }
    onComponentRefresh = async () => {
        const refreshed_data = await this.model.refeshData();
        console.log(refreshed_data);
        this.view.displayContent(refreshed_data.meta, refreshed_data.data, refreshed_data.status);
    }
}

