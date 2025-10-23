import pandas as pd

def xlxs_to_tuple_list(source_file, headers, key_field, source_sheet:int=0):
    xls = pd.ExcelFile(source_file)
    df = xls.parse(xls.sheet_names[source_sheet])
    data = df.to_dict()
    header = headers
    rst_data = []
    rst_key = []
    for row in data[key_field]:
        row_ent = []
        for h in header:
            h_str = str(data[h][row])
            if h_str == 'nan':
                h_str = ''
            row_ent.append(h_str)
        rst_data.append(tuple(row_ent))
        rst_key.append(str(data[key_field][row]))
    return rst_data, rst_key

def xlxs_to_key_tuple_list(source_file, headers, key_field, source_sheet:int=0):
    xls = pd.ExcelFile(source_file)
    df = xls.parse(xls.sheet_names[source_sheet])
    data = df.to_dict()
    header = headers
    rst_data = {}
    rst_key = []
    for row in data[key_field]:
        # row_ent = {}
        row_tuple = []
        for h in header:
            h_str = str(data[h][row])
            if h_str == 'nan':
                h_str = ''
            row_tuple.append(h_str)
        rst_data[str(data[key_field][row])] = tuple(row_tuple)
        # rst_data.append(row_ent)
        rst_key.append(str(data[key_field][row]))
    return rst_data, rst_key

def xlxs_to_key_list(source_file, headers, key_field, source_sheet:int=0):
    xls = pd.ExcelFile(source_file)
    df = xls.parse(xls.sheet_names[source_sheet])
    data = df.to_dict()
    header = headers
    rst_data = {}
    rst_key = []
    for row in data[key_field]:
        row_ent = {}
        for h in header:
            h_str = str(data[h][row])
            if h_str == 'nan':
                    h_str = ''
            row_ent[h] = h_str
        rst_data[str(data[key_field][row])] = row_ent
        rst_key.append(str(data[key_field][row]))
    return rst_data, rst_key

# def xlxs_to_list(source_file, headers, key_field, source_sheet:0):
#     xls = pd.ExcelFile(source_file)
#     df = xls.parse(xls.sheet_names[source_sheet])
#     data = df.to_dict()
#     header = headers
#     rst_data = {}
#     rst_key = []
#     for row in data[key_field]:
#         row_ent = {}
#         for h in header:
#             h_str = str(data[h][row])
#             if h_str == 'nan':
#                     h_str = ''
#             row_ent[h] = h_str
#         rst_data[str(data[key_field][row])] = row_ent
#         rst_key.append(str(data[key_field][row]))
#     return rst_data, rst_key

def xlxs_to_name_list(source_file, headers, key_field, source_sheet:int=0):
    xls = pd.ExcelFile(source_file)
    df = xls.parse(xls.sheet_names[source_sheet])
    data = df.to_dict()
    header = headers
    rst_data = []
    rst_key = []
    for row in data[key_field]:
        row_ent = {}
        for h in header:
            h_str = str(data[h][row])
            if h_str == 'nan':
                    h_str = ''
            row_ent[h] = h_str
        rst_data.append(row_ent)
        rst_key.append(str(data[key_field][row]))
    return rst_data, rst_key

def xlxs_to_self_name_list(source_file, key_field, source_sheet:int=0):
    # print(source_file, key_field)
    xls = pd.ExcelFile(source_file)
    df = xls.parse(xls.sheet_names[source_sheet])
    headers = list(df.columns)
    data = df.to_dict()
    rst_data = []
    rst_key = []
    if key_field in headers:
        for row in data[key_field]:
            row_ent = {}
            for h in headers:
                h_str = str(data[h][row])
                if h_str == 'nan':
                        h_str = ''
                row_ent[h] = h_str
            rst_data.append(row_ent)
            rst_key.append(str(data[key_field][row]))
    return rst_data, rst_key

def xlxs_to_self_number_key_list(source_file, source_sheet:int=0):
    # print(source_file, key_field)
    xls = pd.ExcelFile(source_file)
    df = xls.parse(xls.sheet_names[source_sheet], header=None)
    data = df.to_dict()
    rst_data = []
    rst_key = []
    # print(data[0])
    for row in data[0]:
        row_ent = {}
        for i in range(len(df.columns)):
            h_str = str(data[i][row])
            if h_str == 'nan':
                    h_str = ''
            row_ent[i] = h_str
        rst_data.append(row_ent)
        rst_key.append(str(data[0][row]))
    return rst_data, rst_key

def csv_to_list(source_file, headers, key_field):
    df = pd.read_csv(source_file, dtype=str)
    data = df.to_dict()
    header = headers
    rst_data = []
    rst_key = []
    for row in data[key_field]:
        row_ent = []
        for h in header:
            h_str = str(data[h][row])
            if h_str == 'nan':
                h_str = ''
            row_ent.append(h_str)
        rst_data.append(tuple(row_ent))
        rst_key.append(str(data[key_field][row]))
    return rst_data, rst_key

def csv_to_key_list(source_file, headers, key_field, sep=','):
    df = pd.read_csv(source_file, dtype=str, sep=sep)
    data = df.to_dict()
    # print(data)
    # df.info()
    header = headers
    rst_data = {}
    rst_key = []
    for row in data[key_field]:
        row_tuple = []
        for h in header:
            h_str = str(data[h][row])
            if h_str == 'nan':
                h_str = ''
            row_tuple.append(h_str)
        rst_data[str(data[key_field][row])] = tuple(row_tuple)
        rst_key.append(str(data[key_field][row]))
    return rst_data, rst_key

def csv_to_name_list(source_file, headers, key_field, sep=','):
    df = pd.read_csv(source_file, encoding = "ISO-8859-1", dtype=str, sep=sep)
    # df.info()
    data = df.to_dict()
    header = headers
    rst_data = []
    rst_key = []
    for row in data[key_field]:
        row_ent = {}
        for h in header:
            if h in data:
                h_str = str(data[h][row])
            else:
                h_str = ''
            if h_str == 'nan':
                    h_str = ''
            row_ent[h] = h_str
        rst_data.append(row_ent)
        rst_key.append(str(data[key_field][row]))
    return rst_data, rst_key

def csv_to_self_name_list(source_file, key_field):
    # print(source_file, key_field)
    df = pd.read_csv(source_file, dtype=str)
    headers = list(df.columns)
    data = df.to_dict()
    rst_data = []
    rst_key = []
    if key_field in headers:
        for row in data[key_field]:
            row_ent = {}
            for h in headers:
                h_str = str(data[h][row])
                if h_str == 'nan':
                        h_str = ''
                row_ent[h] = h_str
            rst_data.append(row_ent)
            rst_key.append(str(data[key_field][row]))
    return rst_data, rst_key

def csv_to_self_number_key_list(source_file):
    # print(source_file, key_field)
    df = pd.read_csv(source_file, header=None, sep=None, engine='python', dtype=str)
    # headers = list(df.columns)
    data = df.to_dict()
    print(data)
    rst_data = []
    rst_key = []
    for row in data[0]:
        row_ent = {}
        for i in range(len(df.columns)):
            h_str = str(data[i][row])
            if h_str == 'nan':
                    h_str = ''
            row_ent[i] = h_str
        rst_data.append(row_ent)
        rst_key.append(str(data[0][row]))
    return rst_data, rst_key

def csv_to_self_key_dict(source_file, key_field):
    # print(source_file, key_field)
    df = pd.read_csv(source_file, dtype=str)
    headers = list(df.columns)
    data = df.to_dict()
    rst_data = {}
    rst_key = []
    if key_field in headers:
        for row in data[key_field]:
            row_ent = {}
            for h in headers:
                h_str = str(data[h][row])
                if h_str == 'nan':
                        h_str = ''
                row_ent[h] = h_str
            rst_data[str(data[key_field][row])] = row_ent
            rst_key.append(str(data[key_field][row]))
    return rst_data, rst_key

def csv_to_key_list_with_cond(source_file, headers, key_field, lookup_field, lookup_val):
    df = pd.read_csv(source_file, dtype=str)
    data = df.to_dict()
    # print(data)
    # df.info()
    header = headers
    rst_data = {}
    rst_key = []
    for row in data[key_field]:
        row_tuple = []
        for h in header:
            h_str = str(data[h][row])
            if h_str == 'nan':
                h_str = ''
            row_tuple.append(h_str)
        is_active = False
        if lookup_field in df.columns and str(data[lookup_field][row]) in lookup_val:
            is_active =  True
        if lookup_field.lower() in df.columns and str(data[lookup_field.lower()][row]) in lookup_val:
            is_active = True
        if is_active:
            rst_data[str(data[key_field][row])] = tuple(row_tuple)
            rst_key.append(str(data[key_field][row]))
    return rst_data, rst_key

def dict_list_to_excel(source_list, headers, sheet_name, file_path):
    # print(source_list, headers)
    df_data = []
    for row in source_list:
        df_row = []
        for h in headers:
            # print(row)
            h_str = str(row.get(h, ''))
            df_row.append(h_str)
        df_data.append(df_row)
    df = pd.DataFrame(df_data, columns=headers)
    df.to_excel(file_path, index=False, sheet_name=sheet_name)

def dict_list_to_excel_self_header(source_list, sheet_name, file_path):
    # print(source_list, headers)
    df_data = []
    counter = 0
    headers = []
    for row in source_list:
        if counter == 0:
            for k, v in row.items():
                headers.append(k)
        df_row = []
        for h in headers:
            # print(row)
            h_str = str(row.get(h, ''))
            df_row.append(h_str)
        df_data.append(df_row)
    df = pd.DataFrame(df_data, columns=headers)
    df.to_excel(file_path, index=False, sheet_name=sheet_name)
    
        
        