import sqlite3

class SqliteHandle(object):
    def __init__(self, db_path:str=':memory:') -> None:
        self.db_path = db_path

    def _create_conn(self):
        return sqlite3.connect(self.db_path)

    def _close_conn(self, conn):
        conn.close()

    def _build_where_clause(and_conditions=None, or_conditions=None):
        clauses = []
        params = []

        if and_conditions:
            and_clause = " AND ".join([f"{key} = ?" for key in and_conditions.keys()])
            clauses.append(f"({and_clause})")
            params.extend(and_conditions.values())
        if or_conditions:
            or_clause = " OR ".join([f"{key} = ?" for key in or_conditions.keys()])
            clauses.append(f"({or_clause})")
            params.extend(or_conditions.values())

        where_clause = " AND ".join(clauses) if clauses else ""
        return where_clause, tuple(params)

    def execute_hybrid(self, hybrid_query, and_cooditions=None, or_conditions=None):
        query = hybrid_query
        where_clause, params = self._build_where_clause(and_cooditions, or_conditions)
        if where_clause:
            query += f" WHERE {where_clause}" 
        with self._create_conn() as conn:
            c = conn.cursor()
            try:
                if params:
                    res = c.execute(query, params)
                else:
                    res = c.execute(query)
                c_rst = c.fetchall()
                if isinstance(c_rst, list):
                    columns = [tuple[0] for tuple in res.description]
                    r_set = [dict(zip(columns, row)) for row in c_rst]
                    # print(r_set)
                    return 'ok', r_set
                return 'ko', c_rst
            except sqlite3.Error as e:
                return 'ko', str(e)
            
    def execute_query(self, query, params=None):
        with self._create_conn() as conn:
            c = conn.cursor()
            try:
                if params:
                    res = c.execute(query, params)
                else:
                    res = c.execute(query)
                c_rst = c.fetchall()
                if isinstance(c_rst, list):
                    columns = [tuple[0] for tuple in res.description]
                    r_set = [dict(zip(columns, row)) for row in c_rst]
                    # print(r_set)
                    return 'ok', r_set
                return 'ko', c_rst
            except sqlite3.Error as e:
                return 'ko', str(e)

    def execute_command(self, query, params=None):
        with self._create_conn() as conn:
            c = conn.cursor()
            try:
                if params is None:
                    c_rst = c.execute(query)
                else:
                    if isinstance(params, list):
                        c_rst = c.executemany(query, params)
                    else:
                        c_rst = c.execute(query, params)
                conn.commit()
                c_msg = "{} {} data row with {}.".format(str(query).split(' ')[0], str(c_rst.rowcount), params)
                return 'ok', c_msg
            except sqlite3.Error as e:
                return 'ko', str(e)

    def execute_transaction(self, queries, q_params):
        with self._create_conn() as conn:
            c = conn.cursor()
            if isinstance(queries, list):
                try:
                    c.execute('BEGIN')
                    c_msgs = []
                    c_rsts = {}
                    exec_step = 0
                    for qurey in queries:
                        exec_step += 1
                        for k, q in qurey.items():
                            # print(k, q, q_params)
                            c_rst = c.execute(q, q_params)

                            if k == 'return_data':
                                all_rows = c.fetchall()
                                if len(all_rows) == 0:
                                    return 'ko', 'No result found'
                                if isinstance(all_rows, list):
                                    columns = [tuple[0] for tuple in c_rst.description]
                                    r_set = [dict(zip(columns, row)) for row in all_rows]
                                    conn.execute('COMMIT')
                                    return 'ok', r_set
                            if k.endswith('_stop'):
                                exist_rows = c.fetchall()
                                if exist_rows:
                                    conn.execute('ROLLBACK')
                                    return 'ko', 'stop error: {}'.format(k)
                            if k.endswith('_notfoundstop'):
                                exist_rows = c.fetchall()
                                if not exist_rows:
                                    conn.execute('ROLLBACK')
                                    return 'ko', 'stop error: {}'.format(k)
                                if isinstance(exist_rows, list):
                                    columns = [tuple[0] for tuple in c_rst.description]
                                    c_rsts[k] = [dict(zip(columns, row)) for row in exist_rows]
                            if k.endswith('_data'):
                                all_rows = c.fetchall()
                                if isinstance(all_rows, list):
                                    columns = [tuple[0] for tuple in c_rst.description]
                                    c_rsts[k] = [dict(zip(columns, row)) for row in all_rows]
                            if k.endswith('_option'):
                                if 'options' not in c_rsts:
                                    c_rsts['options'] = {}
                                all_rows = c.fetchall()
                                if isinstance(all_rows, list):
                                    columns = [tuple[0] for tuple in c_rst.description]
                                    c_rsts['options'][k] = [dict(zip(columns, row)) for row in all_rows]
                            return_row = c.fetchone()
                            all_row = c.fetchall()
                            if return_row:
                                q_params[k] = return_row[0]
                            if k.endswith('_id') and c.lastrowid:
                                q_params[k] = c.lastrowid
                                # print(q_params[k])
                            if k.endswith('_count') and all_row:
                                q_params[k] = len(all_row)
                            c_msg = "worked {} data row in step {}".format(str(c_rst.rowcount), str(exec_step))
                            # print(c_msg, q_params)
                            c_msgs.append(c_msg)
                    conn.execute('COMMIT')
                    if c_rsts:
                        return 'ok', c_rsts
                    return 'ok', str(';'.join(c_msgs))
                except sqlite3.Error as e:
                    conn.execute('ROLLBACK')
                    return 'ko', str(e)
            return 'ko', "input must be a list."

    def _query(self, q_type, q_table, q_params, q_keyes):
        changing_fields = []
        if q_params:
            # print(q_params)
            for k, v in q_params.items():
                if k not in q_keyes or q_type == 'select':
                    changing_fields.append(k)
                    if v and isinstance(v, str):
                        q_params[k] = v.strip()
            # print(q_params)
        lookup_fields = []
        if q_keyes:
            for key in q_keyes:
                if key in q_params or q_type == 'insert':
                    lookup_fields.append(key)
        
        if q_type == 'insert':
            q_cmd = self.prepare_insert_statement(q_table, changing_fields, lookup_fields)
            # print(q_cmd, q_keyes, lookup_fields)
            return self.execute_command(q_cmd, q_params)
        if q_type == 'upsert':
            q_cmd = self.prepare_upsert_statement(q_table, changing_fields, lookup_fields)
            return self.execute_command(q_cmd, q_params)
        if q_type == 'update':
            q_cmd = self.prepare_update_statement(q_table, changing_fields, lookup_fields)
            return self.execute_command(q_cmd, q_params)
        if q_type == 'select':
            q_cmd = self.prepare_select_statement(q_table, changing_fields, lookup_fields)
            # print(q_cmd, q_keyes, lookup_fields)
            return self.execute_query(q_cmd, q_params)
        if q_type == 'delete':
            q_cmd = self.prepare_delete_statement(q_table, lookup_fields)
            return self.execute_command(q_cmd, q_params)
        return "ko", "unknown operation type."

    def prepare_insert_statement(self, insert_table, changing_fields, lookup_fields):
        insert_field_list = []
        value_field_list = []
        for changing_field in changing_fields:
            value_field = ''.join([':', changing_field])
            value_field_list.append(value_field)
            insert_field_list.append(changing_field)

        insert_field_string = ', '.join(insert_field_list)
        value_field_string = ', '.join(value_field_list)

        skeleton_statement = """
            INSERT INTO {insert_table} ({insert_field_string})
            VALUES ({value_field_string})
        """.format(
            insert_table=insert_table, 
            insert_field_string=insert_field_string, 
            value_field_string=value_field_string
        )
        if lookup_fields and len(lookup_fields) > 0:
            return_statement = "RETURNING {lookup_field}".format(lookup_field=lookup_fields[0])
            skeleton_statement = ' '.join([skeleton_statement, return_statement])
        return skeleton_statement

    def prepare_upsert_statement(self, insert_table, changing_fields, lookup_fields):
        insert_field_list = []
        value_field_list = []
        for changing_field in changing_fields:
            value_field = ''.join([':', changing_field])
            value_field_list.append(value_field)
            insert_field_list.append(changing_field)

        insert_field_string = ', '.join(insert_field_list)
        value_field_string = ', '.join(value_field_list)

        set_fields = list(set(insert_field_list)-set(lookup_fields))
        set_field_list = []
        for set_field in set_fields:
            set_field_pair = '=excluded.'.join([set_field, set_field])
            set_field_list.append(set_field_pair)

        lookup_field_string = ', '.join(lookup_fields)
        set_field_string = ', '.join(set_field_list)

        skeleton_statement = """
            INSERT INTO {insert_table} ({insert_field_string})
            VALUES ({value_field_string})
            ON CONFLICT({lookup_field_string}) DO UPDATE SET {set_field_string};
        """.format(
            insert_table=insert_table, 
            insert_field_string=insert_field_string, 
            value_field_string=value_field_string,
            lookup_field_string=lookup_field_string,
            set_field_string=set_field_string
        )
        return skeleton_statement

    def prepare_update_statement(self, update_table, changing_fields, lookup_fields):
        update_field_list = []
        for changing_field in changing_fields:
            update_field_pair = '=:'.join([changing_field, changing_field])
            update_field_list.append(update_field_pair)
        
        update_field_string = ', '.join(update_field_list)

        lookup_list = []
        for lookup_field in lookup_fields:
            lookup_field_pair = '=:'.join([lookup_field, lookup_field])
            lookup_list.append(lookup_field_pair)
        
        lookup_field_string = ' and '.join(lookup_list)

        skeleton_statement = """
            UPDATE {update_table}
            SET {update_field_string}
            WHERE {lookup_field_string}
        """.format(
            update_table=update_table, 
            update_field_string=update_field_string, 
            lookup_field_string=lookup_field_string
        )
        return skeleton_statement

    def prepare_select_statement(self, select_table, select_fields, lookup_fields):
        select_field_string = '*'
        if select_fields:
            select_field_string = ', '.join(select_fields)

        skeleton_statement = """
            SELECT {select_field_string}
            FROM {select_table}
        """.format(
            select_table=select_table, 
            select_field_string=select_field_string, 
        )
        if lookup_fields:
            lookup_list = []
            for lookup_field in lookup_fields:
                lookup_field_pair = '=:'.join([lookup_field, lookup_field])
                lookup_list.append(lookup_field_pair)
            
            if lookup_list:
                lookup_field_string = ' AND '.join(lookup_list)
                skeleton_statement = """
                    {skeleton_statement} 
                    WHERE {lookup_field_string}
                """.format(
                    skeleton_statement=skeleton_statement,
                    lookup_field_string=lookup_field_string
                )
        return skeleton_statement

    def prepare_delete_statement(self, delete_table, lookup_fields):
        skeleton_statement = """
            DELETE FROM {delete_table}
        """.format(
            delete_table=delete_table
        )
        if lookup_fields:
            lookup_list = []
            for lookup_field in lookup_fields:
                lookup_field_pair = '=:'.join([lookup_field, lookup_field])
                lookup_list.append(lookup_field_pair)
            
            if lookup_list:
                lookup_field_string = ' AND '.join(lookup_list)
                skeleton_statement = """
                    {skeleton_statement} 
                    WHERE {lookup_field_string}
                """.format(
                    skeleton_statement=skeleton_statement,
                    lookup_field_string=lookup_field_string
                )
        return skeleton_statement

# import re
class SqliteQueryGenerator(object):
    @staticmethod
    def compile_insert_cmd(data, table, output_clause=''):
        sql_params = {}
        insert_field_list = []
        value_field_list = []
        for k, v in data.items():
            if v:
                sql_params[k] = v
                insert_field_list.append(k)
                value_field = ''.join([':', str(k)])
                value_field_list.append(value_field)
        
        insert_field_string = ','.join(insert_field_list)
        value_field_string = ','.join(value_field_list)

        sql_statement = """
            INSERT INTO {insert_table} ({insert_field_string})
            VALUES ({value_field_string}) {output_clause};
        """.format(
            insert_table=table,
            insert_field_string=insert_field_string,
            value_field_string=value_field_string,
            output_clause=output_clause
        )
        return sql_statement, sql_params
    
    @staticmethod
    def compile_update_cmd(data, table, update_fields, key_fields):
        sql_params = {}
        update_params = {}
        key_params = {}
        update_field_list = []
        key_field_list = []
        for k, v in data.items():
            if v:
                if k in update_fields:
                    update_params[k] = v
                    update_field = ''.join([':', str(k)])
                    update_field_list.append('='.join([str(k), update_field]))
                if k in key_fields:
                    key_params[k] = v
                    key_field = ''.join([':', str(k)])
                    key_field_list.append('='.join([str(k), key_field]))

        update_field_string = ','.join(update_field_list)
        key_field_string = ' and '.join(key_field_list)

        sql_statement = """
            UPDATE {update_table}
            SET {update_field_string}
            WHERE {key_field_string}
        """.format(
            update_table=table,
            update_field_string=update_field_string,
            key_field_string=key_field_string
        )
        sql_params = {**update_params, **key_params}
        return sql_statement, sql_params
    
    @staticmethod
    def compile_select_cmd(data, table, select_fields, key_fields):
        sql_params = {}
        select_params = {}
        key_params = {}
        key_field_list = []
        for k, v in data.items():
            if v:
                if k in select_fields:
                    select_params[k] = v
                    select_field = ''.join([':', str(k)])
                    select_fields = list(map(lambda x: x.replace(k, select_field), select_fields))
                if k in key_fields:
                    key_params[k] = v
                    key_field = ''.join([':', str(k)])
                    key_field_list.append('='.join([str(k), key_field]))

        select_field_string = ','.join(select_fields)
        key_field_string = ' and '.join(key_field_list)

        sql_statement = """
            SELECT {select_field_string}
            FROM {select_table}
            WHERE {key_field_string}
        """.format(
            updaselect_tablete_table=table,
            select_field_string=select_field_string,
            key_field_string=key_field_string
        )
        sql_params = {**select_params, **key_params}
        return sql_statement, sql_params
    
    @staticmethod
    def compile_raw_statement(raw_query, data):
        # sql_params = []
        # words = raw_query.split()
        # params_list = [word for word in words if word.startswith(':')]
        # for param in params_list:
        #     sql_params.append(data[param[1:]] if param[1:] in data else None)

        # pattern = r'\b:\w+\b'
        # query = re.sub(pattern, '?', raw_query)
        
        # return query, tuple(sql_params)
        return raw_query, data