import datetime
import cherrypy

class AuthTool(cherrypy.Tool):
    from appdata import AppDataReader
    from server.model.admin import AdminModel
    endpoint_reader = AppDataReader()
    auth_tool = AdminModel()

    def __init__(self):
        cherrypy.Tool.__init__(
            self,
            'before_handler',
            self.auth_check,
            priority=95
        )

    def auth_check(self):
        # print('checking auth...')
        req = cherrypy.request
        headers = req.headers
        path_info = req.path_info
        permission_set = self.endpoint_reader.getEndpointPermission(path_info)
        authorization = headers['Authorization'] if 'Authorization' in headers else None
        # print('authorization: ', authorization)
        # print(path_info, permission_set)
        check_pass = len(permission_set)==0
        ep_data = {"check_pass":check_pass}
        if authorization:
            token = authorization.replace('Bearer ', '')
            # print(token)
            check_pass, user = self.auth_tool.auth_check(token, permission_set)
            # print(check_pass, user)
            if user:
                ep_data['last_user'] = user['user_name']
                ep_data['last_update'] = datetime.datetime.today().strftime('%Y-%m-%d %H:%M:%S')
                # req.json['last_user'] = user['user_name']
                # req.json['last_update'] = datetime.datetime.today().strftime('%Y-%m-%d %H:%M:%S')
        ep_data['check_pass'] = check_pass
        req.ep_data = ep_data
        # req.json['check_pass'] = check_pass
        # print(req.ep_data)
        

class Root(object):
    @cherrypy.expose
    def index(self):
        return open('client/app.html')
    
    @cherrypy.expose
    def default(self, *path):
        return open('client/app.html')

from server.api.meta import MetaDataREST
from server.api.admin import AdminDataREST
from server.api.inventory import InvtDataREST
from server.api.receiving import RecvDataREST
from server.api.shipping import ShipDataREST
from server.api.rma import RmaDataREST
from server.api.work import WorkDataREST
from server.api.track import TrackDataREST
from server.api.rework import ReworkDataREST
from server.api.misc import MiscDataREST
from server.api.vendor import VendorDataREST
from server.api.file import FileDataREST
from server.api.util import UtilREST
from server.api.report import ReportDataREST
from server.work.api import WorkV2Rest

@cherrypy.config(**{'tools.auth.on':True})
class API(object):
    def __init__(self):
        self.meta = MetaDataREST()
        self.admin = AdminDataREST()
        self.invt = InvtDataREST()
        self.recv = RecvDataREST()
        self.ship = ShipDataREST()
        self.rma = RmaDataREST()
        self.work = WorkDataREST()
        self.track = TrackDataREST()
        self.rework = ReworkDataREST()
        self.misc = MiscDataREST()
        self.vendor = VendorDataREST()
        self.file = FileDataREST()
        self.util = UtilREST()
        self.report = ReportDataREST()
        self.work_v2 = WorkV2Rest()

    @cherrypy.expose
    @cherrypy.tools.json_in()
    @cherrypy.tools.json_out()
    def index(self):
        return {'api_call':'Hello API Call'}

def boostrap():
    cherrypy.tools.auth = AuthTool()

    from server.host_conf import config    
    cherrypy.config.update(config)

    cherrypy.tree.mount(Root(), '/', config)
    cherrypy.tree.mount(API(), '/api', config)