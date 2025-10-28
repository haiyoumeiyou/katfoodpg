import json
import cherrypy

from appdata import AppDataReader
from server.model.meta import MetaModel

MetaReader = AppDataReader()
db = MetaModel()

class MetaDataREST(object):

    @cherrypy.expose
    @cherrypy.tools.json_in()
    @cherrypy.tools.json_out()
    def routes(self):
        with open('./appdata/routes.json', "r") as f:
            data = json.load(f)
            return json.dumps({'endpoint':'meta/routes', 'data':data}, default=str)
        
    @cherrypy.expose
    @cherrypy.tools.json_in()
    @cherrypy.tools.json_out()
    def site_meta(self):
        auth_set = []
        default_page = None
        req = cherrypy.request
        authorization = req.headers['Authorization'] if 'Authorization' in req.headers else None
        if authorization:
            token = authorization.replace('Bearer ', '')
            auth_set, default_page = db.getAuthSet(token)
        data = MetaReader.getAuthData('meta.json', auth_set)
        if default_page:
            data['default_page'] = default_page
        # print(data)
        return json.dumps({'endpoint':'meta/site_meta', 'data':data}, default=str)
        
    @cherrypy.expose
    @cherrypy.tools.json_in()
    @cherrypy.tools.json_out()
    def route_meta(self):
        auth_set = []
        default_page = None
        req = cherrypy.request
        authorization = req.headers['Authorization'] if 'Authorization' in req.headers else None
        if authorization:
            token = authorization.replace('Bearer ', '')
            auth_set, default_page = db.getAuthSet(token)
        req_params = cherrypy.request.json
        meta_file = req_params.get('section_meta', 'error.json')
        data = MetaReader.getAuthData(meta_file, auth_set)
        if default_page:
            data['default_page'] = default_page
        # print(data)
        return json.dumps({'endpoint':'meta/route_meta', 'data':data}, default=str)