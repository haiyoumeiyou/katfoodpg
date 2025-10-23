import { DataHandle } from './module/api_handle.js';

class Router {
    constructor() {
        this.api_handle = new DataHandle();
        this.site_meta = {};
        this.routes = [];
    }
    static deepRoutePicker(route_path, level_routes, routing_level) {
        const init_route_elements = route_path.split('/');

        if (init_route_elements.length === routing_level) {
            if (level_routes) {
                return level_routes[0].path;
            }
        }
        if (init_route_elements.length > routing_level) {
            return route_path;
        }
        return null;
    }
    static async metaSectionToDataEndpoint(meta_section) {
        const endpoint_data = meta_section.split('::');
        const data_api_endpoint = '/api/' + endpoint_data.join('/').replace('.json', '');
        return data_api_endpoint;
    }
    async setLocalToken(token) {
        localStorage.setItem('jwt_token', token);
        return localStorage.getItem('jwt_token');
    }
    async getLocalToken() {
        return localStorage.getItem('jwt_token');
    }
    async clearLocalData() {
        // return localStorage.clear();
        return localStorage.removeItem('jwt_token');
    }
    async getLoginStatus() {
        const token = localStorage.getItem('jwt_token');
        return token ? true : false;
    }
    async dataExchange(endpoint, params={}) {
        const req_body = params;
        const api_rst = await this.api_handle.dataExchange(endpoint, req_body);
        // console.log('dataechange: ', api_rst);
        const data = api_rst.data;
        await this.checkDataStatus(data);
        return data;
    }
    async fileExchange(endpoint, params={}) {
        const req_body = params;
        const api_rst = await this.api_handle.fileExchange(endpoint, req_body);
        return api_rst;
    }
    async printFileExchange(endpoint, params={}) {
        const req_body = params;
        const api_rst = await this.api_handle.printFileExchange(endpoint, req_body);
        return api_rst;
    }
    async fileUpload(endpoint, file_data) {
        let req_body = file_data;
        const api_rst = await this.api_handle.fileUpload(endpoint, req_body);
        return api_rst;
    }
    async checkDataStatus(data) {
        // console.log(data, data.length);
        if (data.length && data.length == 2) {
            // console.log(data[0])
            if (data[0] === 'ia') {
                await this.clearLocalData();
                return document.location.href = '/';
            }
        }
    }
    async getRouteMeta(route) {
        const req_body = route.meta_section ? {"section_meta": route.meta_section} : {}; 
        // const api_rst = await this.api_handle.dataExchange(route.meta_endpoint, req_body);
        const api_rst = await this.dataExchange(route.meta_endpoint, req_body);
        const section_meta = api_rst;
        return section_meta;
    }
    async getRouteData(route, params={}) {
        const req_body = params;
        // console.log('retriev route data for route ', route);
        if (route.meta_section) {
            const endpoint_data = route.meta_section.split('::');
            const data_api_endpoint = '/api/' + endpoint_data.join('/').replace('.json', '');
            // console.log(data_api_endpoint);
            const api_rst = await this.dataExchange(data_api_endpoint, req_body);
            const section_data = api_rst;
            return section_data;
        }
        return null;
    }
    async _getSiteMeta() {
        const api_rst = await this.api_handle.dataExchange("/api/meta/site_meta");
        this.site_meta = api_rst.data;
        this.routes = this.site_meta.routes;
        // console.log(this.site_meta);
        return this.site_meta;
    }
    updateRoutes(routes) {
        this.routes = routes;
    }
    async navigateTo(route, routeElement) {
        const module_path = route.handler;
        const { render } = await import(module_path);
        await render(route, routeElement, this);
    }
    loadNavigation(routePath) {
        let newURL = ''.concat(window.location.origin, routePath); 
        history.pushState({}, 'newUrl', newURL);
        return this._handleRouteChange(routePath);
    }
    async _checkRouteAccess(route) {
        const jwt_token = localStorage.getItem('jwt_token');
        if (jwt_token || (route.auth && route.auth.length == 0)) {
            return route;
        }
        let unauth_route = this.routes.find(rt => rt.name == 'unauth'); 
        unauth_route.from = route;
        return unauth_route;
    }
    async _handleRouteChange(routePath) {
        await this._getSiteMeta();
        let route = this.routes.find(route => route.path == routePath);
        // console.log(routePath, route);
        if (route) {
            const auth_route = await this._checkRouteAccess(route);
            // console.log(auth_route);
            return auth_route;
        } else {
            const unauth_route = this.routes.find(rt => rt.name == 'unauth') ; 
            const load_route = unauth_route ? unauth_route : {name:'unauth', path:'/unauth', "page_title": `<h1>Unauth Class</h1>`, "handler": "/js/page/unauth.js"};

            return load_route;
        }
    }
}

export { Router }
