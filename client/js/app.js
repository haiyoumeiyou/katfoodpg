import { UiHandle } from './module/ui_handle.js';
import { Router } from './router.js';

// if (!localStorage.getItem('jwt_token')) {
//     console.log('no token.');
//     localStorage.setItem('jwt_token', 'token_value_string_sieuiou4idgg676434');
// } else {
//     console.log('found token: ', localStorage.getItem('jwt_token'));
// }

class Model {
    constructor() {
        this.router = new Router();
        this.site_meta = {};
        this.default_page = null;
        this.routes = [];
        this.is_login = false;
        this.active_route = null;
    }
    async _getMeta() {
        this.site_meta = await this.router._getSiteMeta();
        this.is_login = await this.router.getLoginStatus();
        if (this.site_meta.default_page) {
            this.default_page = this.site_meta.default_page;
        }
        this.routes = this.site_meta.routes;
        return this.site_meta;
    }
    async _makeRoute(route) {
        const route_elements = route.split('/');
        let page_route = route;
        let app_route = '/';
        if (route_elements.length > 1) {
            app_route = ''.concat('/', route_elements[1]);
        }
        if (this.default_page && (route_elements[1] == 'home' || route_elements[1] == '')) {
            const default_route_elements = this.default_page.split('/');
            app_route = ''.concat('/', default_route_elements[1]);
            page_route = this.default_page;
        }
        // console.log('app route: ', page_route, route, app_route, route_elements, this.default_page, this.site_meta);
        this.active_route = app_route;
        return {"app_route": app_route, "page_route": page_route}
    }
    async bindRoutesChange(callback) {
        const site_meta = await this._getMeta();
        this.onRoutesChanged = callback(site_meta);
    }
    async onStateChange(route, routeElement) {
        const routes = await this._makeRoute(route);
        const load_route = await this.router.loadNavigation(routes.app_route);
        // console.log(load_route);
        const module_path = load_route.handler;
        const { render } = await import(module_path);
        await render(load_route, routeElement, this.router, routes.page_route);
    }
    async onLogonEvent(route, container) {
        // console.log(route, container);
        // const route_elements = route.split('/');
        let app_route = '/';
        if (this.default_page) {
            app_route = this.default_page;
        }
        // if (route_elements.length > 1) {
        //     app_route = ''.concat('/', route_elements[1]);
        // }
        // console.log('app route: ', route, app_route);
        // console.log(app_route);
        const load_route = await this.router.loadNavigation(app_route);
        if (this.is_login) {
            const token = await this.router.getLocalToken();
            if (token) {
                const params = {"token": token.toString()};
                const set_server_logon = await this.router.dataExchange('/api/admin/user_logout', params);
                if (set_server_logon[0] == 'ok') {
                    await this.router.clearLocalData();
                    document.location.href = '/';
                    // this.router.navigateTo(load_route, container);
                }
            }
        }
        // this.is_login = await this.router.getLoginStatus();
        // return this.is_login;
    }
}

class View {
    constructor() {
        this.body = UiHandle.getElement('body');
        this.ui_handle = new UiHandle(this.body);

        this.header = this.ui_handle.createElement('header');
        this.header.name = 'header';
        this.section = this.ui_handle.createElement('section');
        this.nav = this.ui_handle.createElement('nav');
        this.nav.name = 'left-nav';
        this.article = this.ui_handle.createElement('article');
        this.section.append(this.nav, this.article);
        this.footer = this.ui_handle.createElement('footer');
        this.body.append(this.header, this.section, this.footer);

    }
    displayContent(site_meta, is_login, route) {
        // console.log(is_login, route);
        if (site_meta) {
            this.displayByRouteLocation(site_meta.routes, this.header, is_login, route);
        }
        if (is_login && site_meta) {
            this.displayByRouteLocation(site_meta.routes, this.nav, is_login, route);
        }
    }
    displayByRouteLocation(routes, location, is_login, route) {
        // console.log('display route: ', location, route);
        location.innerHTML = '';
        const nav_list = this.ui_handle.createElement('ul');
        location.appendChild(nav_list);
        let item_count = 0;
        if (routes) {
            routes.forEach(rt => {
                let found = rt.location.find(value => value == location.name);
                if (found) {
                    const listItem = this.ui_handle.createElement('li', rt.css_class?rt.css_class:null);
                    const listBtn = this.ui_handle.createElement('button');
                
                    listItem.appendChild(listBtn);
                    listBtn.textContent = rt.name;
                    listBtn.value = rt.path;
                    // console.log(rt.path, route);
                    if(rt.path === route) {
                        listBtn.classList.add('active');
                    }
                    
                    nav_list.appendChild(listItem);
                    item_count++;
                }
            });
        }
        if (location.name === 'left-nav' && item_count === 1) {
            location.remove();
        }
        if (location.name === 'header') {
            const listItem = this.ui_handle.createElement('li');
            const listBtn = this.ui_handle.createElement('button');
        
            listItem.appendChild(listBtn);
            listBtn.textContent = is_login?'Logout':'Login';
            listBtn.value = 'loginEvent';
            
            nav_list.appendChild(listItem);
        }
    }
    bindNavChanged(handler) {
        this.header.addEventListener('click', (event) => {
            if (event.target.tagName === 'BUTTON' && event.target.value !== 'loginEvent') {
                handler(event.target.value, this.article);
            }
        });
        this.nav.addEventListener('click', (event) => {
            if (event.target.tagName === 'BUTTON') {
                handler(event.target.value, this.article);
            }
        });
    }
    bindLogonEvent(handler) {
        this.header.addEventListener('click', (event) => {
            if (event.target.tagName === 'BUTTON' && event.target.value === 'loginEvent') {
                handler(window.location.pathname, this.article);
            }
        });
    }
    bindStateChanged(handler) {
        window.addEventListener('popstate', (event) => {
            // console.log('back...', event);
            handler(event.target.location.pathname, this.article);
        });

        window.addEventListener('DOMContentLoaded', (event) => {
            // console.log('reloading...', event);
            handler(event.target.location.pathname, this.article);
        });
    }
}

class Controller {
    constructor(model, view) {
        this.model = model;
        this.view = view;

        this.model.bindRoutesChange(this.onRoutesChanged);

        this.view.bindNavChanged(this.handleStateEvent);
        this.view.bindStateChanged(this.handleStateEvent);
        this.view.bindLogonEvent(this.handleLogonEvent);
    }
    onRoutesChanged = async site_meta => {
        // console.log(site_meta);
        const routes = await this.model._makeRoute(this.active_route?this.active_route:'/')
        // console.log(routes);
        this.view.displayContent(site_meta, this.model.is_login, routes.app_route);
        // this.view.displayByRouteLocation(routes, this.view.header);
        // this.view.displayByRouteLocation(routes, this.view.nav);
    }
    handleStateEvent = async (route, container) => {
        await this.model._getMeta();
        const routes = await this.model._makeRoute(route);
        // console.log(routes);
        // this.model.is_login = await this.model.router.getLoginStatus();
        this.view.displayContent(this.model.site_meta, this.model.is_login, routes.app_route);
        this.model.onStateChange(route, container, this.model.router);
    }
    handleLogonEvent = async (route, container) => {
        await this.model.onLogonEvent(route, container);
        // this.model.is_login = await this.model.router.getLoginStatus();
        // this.view.displayContent(this.model.site_meta, this.model.is_login);
    }
}

const app = new Controller(new Model(), new View());

export { app }