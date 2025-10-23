import jwt

from servicehandle.sqlitehandler import DatabaseHandler
from servicehandle.postgresqlhandle import PostgresqlHandle
from appdata import Settings

# db = DatabaseHandler('local/data.sqlite')
settings = Settings()
db = PostgresqlHandle(settings)

class MetaModel(object):
    version = 'webapp_0.0a'
    obj_class = 'Auth DB Handler'
    cls_attrs = ('user_id', 'role_id', 'menu_id', 'link_id')

    def __str__(self):
        return f"""
            schema version: {self.version}, 
            class: {self.obj_class}, 
            attrs: {self.cls_attrs}
        """
    
    def _query(self, q_type, q_table, q_params, q_keyes):
        return db._query(q_type, q_table, q_params, q_keyes)
    
    def read(self, query, query_params, headers=None):
        if query_params:
            return db.read(query, query_params)
        return db.read(query)
    
    def getAuthSet(self, token):
        q_cmd = "SELECT user_id, token_ip, token_time, u.roles, u.default_page FROM user_token ut INNER JOIN users u ON ut.user_id = u.eid WHERE user_id = :user_id AND token = :token"
        token_payload = jwt.decode(token, settings.jwt_key, algorithms=['HS256'])
        if "eid" in token_payload:
            param = {"user_id": token_payload["eid"], "token":str(token)}
            q_rst = self.read(q_cmd, param)
            # print(q_rst)
            if q_rst[0] == 'ok' and len(q_rst[1]) > 0:
                default_page = q_rst[1][0]['default_page']
                auth_set = [x.strip() for x in q_rst[1][0]['roles'].split(',')] if q_rst[1][0]['roles'] else []
                # print(q_rst, auth_set)
                return auth_set, default_page
            return []
        return []