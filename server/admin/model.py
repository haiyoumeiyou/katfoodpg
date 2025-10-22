import datetime
import jwt
from passlib.hash import pbkdf2_sha256

from hostdata import Settings
settings = Settings()


class AdminService(object):
    version = 'webapp_0.0a'
    obj_class = 'Auth DB Handler'
    cls_attrs = ('user_id', 'role_id', 'menu_id', 'link_id')

    def __init__(self, db) -> None:
        self.db = db

    def __str__(self):
        return f"""
            schema version: {self.version}, 
            class: {self.obj_class}, 
            attrs: {self.cls_attrs}
        """
    
    def _hash_password(self, passwd):
        return pbkdf2_sha256.hash(str(passwd))

    def _verify_password(self, hash, passwd):
        return pbkdf2_sha256.verify(passwd, hash)
    
    def _query(self, q_type, q_table, q_params, q_keyes):
        return self.db._query(q_type, q_table, q_params, q_keyes)
    
    def read(self, query, query_params, headers=None):
        if query_params:
            return self.db.read(query, query_params)
        return self.db.read(query)

    def modify(self, query, query_params, headers=None):
        return self.db.modify(query, query_params)
    
    def insert(self, query, query_params, headers=None):
        return self.db.insert(query, query_params)
    
    def set_password(self, query, query_params, headers=None):
        if 'password' in query_params:
            query_params['hash'] = self._hash_password(query_params['password'])
            return self.modify(query, query_params)
        return 'ko', 'missing data...'
    
    def get_token(self, query, query_params, headers=None):
        q_cmd = "SELECT eid, user_name, hash FROM users WHERE user_name = :user_name"
        q_rst = self.read(q_cmd, query_params)
        if q_rst[0] == 'ok' and len(q_rst[1]) > 0:
            # print(q_rst)
            verified = self._verify_password(q_rst[1][0]['hash'], query_params['password'])
            if verified:
                expiry = datetime.datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
                token_ip = headers['Remote-Addr'] if headers['Remote-Addr'] else None
                payload = {"eid":q_rst[1][0]['eid'],"user":q_rst[1][0]['user_name'],"expiry":expiry,"token_ip":token_ip}
                jwt_token = jwt.encode(payload, settings.jwt_key, algorithm='HS256')
                param = {"user_id":q_rst[1][0]['eid'], "token":str(jwt_token), "token_ip":token_ip}
                cmd = "INSERT INTO user_token (user_id, token, token_ip) VALUES (:user_id, :token, :token_ip) RETURNING eid"
                rst = self.insert(cmd, param)
                if rst[0] == 'ok':
                    data = {"jwt":jwt_token}
                    return 'ok', data
                return rst
            return 'ko', 'incorrect password...'
        return 'ko', 'invalid user...'
    
    def auth_check(self, token, permission_set):
        q_cmd = "SELECT user_id, token_ip, token_time, u.roles, u.user_name FROM user_token ut INNER JOIN users u ON ut.user_id = u.eid WHERE user_id = :user_id AND token = :token"
        token_payload = jwt.decode(token, settings.jwt_key, algorithms=['HS256'])
        # print(token_payload)
        if "eid" in token_payload:
            param = {"user_id": token_payload["eid"], "token":str(token)}
            q_rst = self.read(q_cmd, param)
            # print(q_rst)
            if q_rst[0] == 'ok' and len(q_rst[1]) > 0:
                auth_set = [x.strip() for x in q_rst[1][0]['roles'].split(',')] if q_rst[1][0]['roles'] else []
                # print(q_rst[1][0], permission_set, auth_set)
                # print(len(list(set(permission_set)&set(auth_set)))>0, len(auth_set)==0, auth_set, list(set(permission_set)&set(auth_set)))
                return len(permission_set)==0 or len(set(permission_set)&set(auth_set))>0, q_rst[1][0]
            return False, None
        return False, None



    