import { UiHandle } from "../module/ui_handle.js";

export function render(route, routeElement, appRouter) {
    const app = new Controller(new Model(route, appRouter), new View(routeElement));
    return app;
}

class Model {
    constructor(route, appRouter) {
        this.route = route;
        this.router = appRouter; 
        // console.log('page init: ', this.route, this.router);
        this.section_meta = {};
        // this._init();
    }
    async bindOnRouteLoad(callback) {
        this.onRouteLoad = callback;
    }
    async getMeta() {
        this.section_meta = await this.router.getRouteMeta(this.route);
        return this.section_meta;
    }
    async onSectionNavChange(route, routeElement) {
        const load_route = await this.router.loadNavigation(route);
        // const module_path = "/js/page/page.js";
        const module_path = load_route.handler;
        const { render } = await import(module_path);
        await render(load_route, routeElement, this.router);
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
        this.page_article = this.ui_handle.createElement('article');
        this.app.append(this.title, this.page_article);
    }
    _resetContent() {
        this.app.innerHTML = '';
    }
    async displayContent(dataHandler) {
        // console.log('section display: ', dataHandler)
        const sect_data = await dataHandler;
        this.title.textContent = sect_data.title;
        // console.log(sect_data)
        if (sect_data.table_template) {
            // console.log('load sect table: ', sect_data.table_template);
            this.page_article.textContent = JSON.stringify(sect_data.table_template);
        }
    }

    bindSectionNavChange(handler) {
        if (this.page_article) {
            this.page_article.addEventListener('click', (event) => {
                if (event.target.tagName === 'BUTTON') {
                    handler(event.target.value, this.page_article);
                }
            });
        }
    }
}

class Controller {
    constructor(model, view){
        this.model = model;
        this.view = view;

        // this.model._init();
        this.model.bindOnRouteLoad(this.onRouteLoad);

        this.onRouteLoad(this.model.getMeta());
    }

    onRouteLoad = dataHandler => {
        this.view.displayContent(dataHandler);
    }

    handleSectionNavChange = (route, container) => {
        this.model.onSectionNavChange(route, container);
    }
}

