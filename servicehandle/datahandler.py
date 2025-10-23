def pivotListByKeyCol(data_list, list_key, key_col, val_col):
    if not data_list:
        return data_list
    keyed_set = {}
    for row in data_list:
        print(row)
        new_pair = {row[key_col]:row[val_col]}
        if row[list_key] in keyed_set:
            keyed_set[row[list_key]].update(new_pair)
        else:
            keyed_set[row[list_key]] = new_pair
    pivot_list = []
    for k, v in keyed_set.items():
        # print(k, v)
        key_pair = {list_key:k}
        row = {**key_pair, **v}
        # print(row)
        pivot_list.append(row)
    return pivot_list