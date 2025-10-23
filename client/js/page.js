import { UiHandle } from "./module/ui_handle.js";

export function render(appRoute, routeElement, appRouter, route) {
    const app = new Controller(new Model(appRoute, appRouter, route), new View(routeElement));
    return app;
}

class Model {
    constructor(appRoute, appRouter, route) {
        this.route = appRoute;
        this.router = appRouter; 
        this.section_meta = {};
        this.auth_routes = [];
        this.initRoute = route?route:null;
    }
    async _getMeta() {
        this.section_meta = await this.router.getRouteMeta(this.route);
        const route_elements = this.initRoute.split('/');
        if (route_elements.length <= 2 && this.section_meta.default_page) {
            this.initRoute = this.section_meta.default_page;
        }
        return this.section_meta;
    }
    async bindOnRouteLoad(callback) {
        await this._getMeta();
        if (this.section_meta.sect_nav && Array.isArray(this.section_meta.sect_nav)) {
            this.auth_routes = await UiHandle.listItemsFiltered(this.router.routes, this.section_meta.sect_nav, 'path');
        }
        this.onRouteLoad = callback(this.section_meta, this.auth_routes);
    }
    async onSectionNavChange(route, routeElement) {
        const load_route = await this.router.loadNavigation(route);
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
        this.nav_bar = this.ui_handle.createElement('p', 'horizontal_menu');
        this.page_article = this.ui_handle.createElement('div');
        this.app.append(this.title, this.nav_bar, this.page_article);
    }
    _resetContent() {
        this.app.innerHTML = '';
    }
    displayContent(section_meta, routes, current_route) {
        this.nav_bar.innerHTML = '';
        if (routes) {
            this.displayNav(routes, current_route);
        }
    }
    displayNav(routes, current_route) {
        this.nav_bar.innerHTML = '';
        const nav_list = this.ui_handle.createElement('ul');
        this.nav_bar.appendChild(nav_list);
        routes.forEach(rt => {
            const listItem = this.ui_handle.createElement('li', rt.css_class?rt.css_class:null);
            const listBtn = this.ui_handle.createElement('button');
        
            listItem.appendChild(listBtn);
            listBtn.textContent = rt.name;
            listBtn.value = rt.path;
            if (current_route && rt.path === current_route) {
                listBtn.classList.add('active');
            }
            
            nav_list.appendChild(listItem);
        });
    }

    bindSectionNavChange(handler) {
        this.nav_bar.addEventListener('click', (event) => {
            if (event.target.tagName === 'BUTTON') {
                handler(event.target.value, this.page_article);
            }
        });
    }
}

class Controller {
    constructor(model, view){
        this.model = model;
        this.view = view;

        this.model.bindOnRouteLoad(this.onRouteLoad);
        
        this.view.bindSectionNavChange(this.handleSectionNavChange);
    }
    onRouteLoad = (section_meta, auth_routes) => {
        let defaul_nav_route = null;
        if (this.model.initRoute) {
            const defaul_route = this.model.router.constructor.deepRoutePicker(this.model.initRoute, this.model.section_meta.sect_nav, 2);
            if (defaul_route) {
                this.model.onSectionNavChange(defaul_route, this.view.page_article);
            }
            defaul_nav_route = defaul_route;
        }
        this.view.displayContent(section_meta, auth_routes, defaul_nav_route);
    }
    handleSectionNavChange = (route, container) => {
        // console.log(route);
        this.view.displayContent(this.model.section_meta, this.model.auth_routes, route);
        this.model.onSectionNavChange(route, container);
    }
}

