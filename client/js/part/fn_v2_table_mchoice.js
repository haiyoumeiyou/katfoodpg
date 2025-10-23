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

        const q_param = this.route.param ?? {};
        await this.getPageData(q_param);
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

        this._commit(this.component_data, endpoint_status);
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
    async displayContent(componentMeta, componentData) {
        // this.title.textContent = sect_data.title;
        console.log(componentMeta, componentData);
        // if (section_meta.nav_bar) {
        //     this.displayNavbar(section_meta.nav_bar);
        // }
        // if (section_meta.table_template) {
        //     this.displayTable(section_meta.table_template, table_data);
        // }
    }
}

class Controller {
    constructor(model, view){
        this.model = model;
        this.view = view;

        this.model.bindOnRouteLoad(this.onRouteLoad)

    }

    onRouteLoad = async () => {
        const componentMeta = await this.model.getMeta();
        this.view.displayContent(componentMeta, this.model.component_data);
    }
}

