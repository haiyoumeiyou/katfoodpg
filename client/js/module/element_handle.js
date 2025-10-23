const element_build = {}

element_build.field = (config, data) => {
    // console.log(config);
    let field_wrap = null;
    const field_element = document.createElement(config['f_tag']);

    if ('f_type' in config) { field_element.type = config['f_type']; }
    if ('f_dname' in config && config['f_tag'] != 'input') { field_element.textContent = config['f_dname']; }
    if ('f_dname' in config && config['f_tag'] == 'input') { field_element.placeholder = config['f_dname']; }
    if ('f_value' in config) { field_element.value = config['f_value']; }
    if ('f_id' in config) { field_element.id = config['f_id']; }
    if ('f_event_id' in config) { field_element.event_id = config['f_event_id']; }
    if ('f_display' in config) { field_element.display_loc = config['f_display']; }
    if ('f_css' in config) {
        const classNames = config['f_css'].split(' ');
        classNames.forEach(className => {
            field_element.classList.add(className);
        });
    }
    if ('f_data_id' in config) { field_element.data_id = config['f_data_id']; }
    if ('f_data' in config) { field_element.data_value = data[config['f_data']]; }

    if ('f_list' in config && config['f_tag'] == 'input') { 
        field_wrap = document.createElement('div');
        field_wrap.classList.add('dropdown');
        field_wrap.style.width = '100%';
        field_wrap.append(field_element);
        field_element.setAttribute('list', config['f_list']); 
        // field_element.classList.add('dropdown-input');

        if ('options' in data && config['f_list'] in data['options']) {
            console.log(data['options']);
            const list_element = document.createElement('datalist');
            list_element.classList.add('dropdown-list');
            list_element.setAttribute('id', config['f_list']);
            data['options'][config['f_list']].forEach(option_val => {
                const option_element = document.createElement('option');
                option_element.value = option_val;
                option_element.text = option_val + ' text';
                list_element.append(option_element);
                option_element.onclick = () => {
                    field_element.value = option_element.value;
                    list_element.style.display = 'none';
                }
            });

            field_wrap.append(list_element);
            field_element.onmouseover = () => {
                list_element.style.display = 'block';
            }
            list_element.onmouseleave = () => {
                list_element.style.display = 'none';
            }
        }
    }

    if ('f_list' in config && config['f_tag'] == 'select') {
        if ('options' in data && config['f_list'] in data['options']) {
            console.log(data['options']);
            
            data['options'][config['f_list']].forEach(option_val => {
                const option_element = document.createElement('option');
                option_element.value = option_val;
                option_element.text = option_val + ' text';
                field_element.append(option_element);
            });
        }
    }

    if ('f_id' in config && data && config['f_id'] in data) { 
        field_element.value = data[config['f_id']]; 
    }
    field_element.classList.add('mr-1');

    let wrap_elemnet = null;
    if ('f_label' in config && config['f_tag'] == 'input') {
        wrap_elemnet = document.createElement('label');
        wrap_elemnet.setAttribute('for', config['f_id']);
        wrap_elemnet.innerText = config['f_label'];
        // wrap_elemnet.innerText = field['f_label'];
        if ('f_id' in config && config['f_id'] in data) { 
            wrap_elemnet.value = data[config['f_id']]; 
        }
        field_element.classList.add('ml-1');
        wrap_elemnet.append(field_element);
        // console.log(wrap_elemnet);
    }

    return wrap_elemnet?wrap_elemnet:(field_wrap?field_wrap:field_element);
}

element_build.element = (tag, className) => {
    const element = document.createElement(tag)

    if (className) {
        const class_list = className.split(' ');
        class_list.forEach(item => {
            element.classList.add(item);
        });
    }

    return element;
}

element_build.alertMessage = (message, container, cssClass, timeout=2000) => {
    const alert = document.createElement('p', cssClass);
    alert.textContent = message;
    container.prepend(alert);
    setTimeout(() => {
        alert.innerHTML = '';
        alert.remove();
    }, timeout);

    return alert;
}

element_build.tabBar = (config, data) => {
    const tabbar = document.createElement('div');
    tabbar.classList.add('search');
    tabbar.classList.add('mt-2');
    config.forEach(field => {

        const field_element = element_build.field(field, data);
        tabbar.append(field_element);
    });

    return tabbar;
}

element_build.searchBar = (config, data) => {
    // console.log(config);
    const searchar = document.createElement('div');
    searchar.classList.add('search');
    searchar.classList.add('mt-2');
    config.forEach(field => {
        
        const field_element = element_build.field(field, data);
        searchar.append(field_element);
    });

    return searchar;
}

element_build.inputColumns = (config, data) => {
    // console.log(data);
    const card = document.createElement('div');
    card.classList.add('card');
    card.classList.add('column_in_card')
    // card.append(data);
    config.forEach(field => {
        const row_div = document.createElement('div');
        row_div.classList.add('label_grid')
        
        const field_element = element_build.field(field, data);

        const strong = document.createElement('strong');
        strong.innerText = field.f_dname + ':';
        strong.style.float = 'left';
    
        row_div.append(strong, field_element);
        card.append(row_div);
    });
    return card;
}

element_build.listGrid = (config, data) => {
    const list = document.createElement('div');
    list.classList.add('list-fixed-scroll');
    const header = document.createElement('div');
    header.classList.add('column_in_card');
    header.classList.add('list-fixed-header')
    config.forEach(field => {
        const strong = document.createElement('strong');
        strong.innerText = field.d_name;
        header.append(strong);
    });
    data.forEach(row => {
        const d_row = document.createElement('div');
        d_row.classList.add('column_in_card')
        config.forEach(field => {
            const txt = document.createElement('p');
            txt.innerText = isNaN(row[field.f_id])?row[field.f_id]:row[field.f_id].toFixed(2);
            d_row.append(txt);
        });
        list.prepend(d_row);
    });
    list.prepend(header);

    return list;
}

element_build.titleGrid = (config, data) => {
    const title = document.createElement('div');
    title.classList.add('column_in_card')
    config.forEach(field => {
        const row_div = document.createElement('div');
        row_div.classList.add('label_grid')
        const strong = document.createElement('strong');
        strong.innerText = field.d_name + ':';
        strong.style.float = 'left';
        const txt = document.createElement('p');
        txt.innerText = (field.f_id in data && data[field.f_id])?(data[field.f_id]):'';
        // txt.style.float = 'right';
        row_div.append(strong, txt);
        title.append(row_div);
    });

    return title;
}

element_build.tableGrid = (config, data) => {
    const t_div = document.createElement('div');
    t_div.classList.add('m-1');
    t_div.classList.add('table-fixed-header');
    const table = document.createElement('table');
    table.classList.add('table');
    table.classList.add('table-dark');
    const head = document.createElement('thead');
    head.classList.add('thead-primary');
    const thr = document.createElement('tr');
    const body = document.createElement('tbody');
    head.append(thr);

    table.append(head, body);
    console.log(config);
    config.forEach(field => {
        const th = document.createElement('th');
        th.innerText = field.d_name?field.d_name:field.f_dname;
        thr.append(th);
    });

    if (data && data.length > 0) {
        data.forEach(row => {
            const tr = document.createElement('tr');
            config.forEach(field => {
                const td = document.createElement('td');
                td.innerText = row[field.f_id]?row[field.f_id]:'';
                if (field.f_css_class) {
                    td.classList.add(field.f_css_class);
                }
                tr.append(td);
            });
            body.append(tr);
        });
    }

    t_div.append(table)
    return t_div;
}

element_build.tableWithEvent = (config, data) => {
    console.log(config);
    // const fields = config.filter(obj => !obj.hasOwnProperty('f_event_id'));
    // const events = config.filter(obj => obj.hasOwnProperty('f_event_id'));
    const fields = config.fields;
    const events = config.events;

    // console.log(fields, events, data)
    const t_div = document.createElement('div');
    t_div.classList.add('m-1');
    t_div.classList.add('table-fixed-header');
    const table = document.createElement('table');
    table.classList.add('table');
    table.classList.add('table-dark');
    const head = document.createElement('thead');
    head.classList.add('thead-primary');
    const thr = document.createElement('tr');
    const body = document.createElement('tbody');
    head.append(thr);

    table.append(head, body);
    // console.log(fields);
    fields.forEach(field => {
        const th = document.createElement('th');
        th.innerText = field.d_name?field.d_name:field.f_dname;
        thr.append(th);
    });
    if (events && events.length > 0) {
        const th = document.createElement('th');
        thr.append(th);
    }

    if (data && data.length > 0) {
        data.forEach(row => {
            const tr = document.createElement('tr');
            fields.forEach(field => {
                const td = document.createElement('td');
                td.innerText = row[field.f_id]?row[field.f_id]:'';
                if (field.f_css_class) {
                    td.classList.add(field.f_css_class);
                }
                tr.append(td);
            });
            if (events && events.length > 0) {
                const td = document.createElement('td');
                events.forEach(event => {
                    const action = element_build.field(event, row);

                    action.event_id = event.f_event_id;
                    action.data_id = row[event.f_id];
                    action.name = event.f_id;
                    if (event.container) {
                        action.container = event.container;
                    }
                    td.append(action);
                });

                tr.append(td);
            }
            body.append(tr);
        });
    }


    t_div.append(table)
    return t_div;
}

element_build.field_backward_compatible = (config, data) => {
    // console.log(config, data);
    let field_wrap = null;
    const p = document.createElement('p');
    const field_label = document.createElement('label');
    field_label.textContent = config['d_name'];
    const field_element = document.createElement(config['f_element']);

    if ('f_type' in config) { field_element.type = config['f_type']; }
    if ('d_name' in config && config['f_element'] != 'input') { field_element.textContent = config['d_name']; }
    if ('f_value' in config) { field_element.value = config['f_value']; }
    if ('f_id' in config) { field_element.id = config['f_id']; }
    if ('f_event_id' in config) { field_element.event_id = config['f_event_id']; }
    if ('f_display' in config) { field_element.display_loc = config['f_display']; }
    if ('f_css' in config) {
        const classNames = config['f_css'].split(' ');
        classNames.forEach(className => {
            field_element.classList.add(className);
        });
    }
    if ('f_attr' in config) { field_element.setAttribute(config['f_attr'], true); }
    // if ('f_data_id' in config) { field_element.data_id = config['f_data_id']; }
    // if ('f_data' in config) { field_element.data_value = data[config['f_data']]; }
    if ('f_id' in config && config['f_id'] in data) { 
        field_element.value = data[config['f_id']]; 
    }

    if ('f_list' in config && config['f_element'] == 'input') { 
        field_wrap = document.createElement('div');
        field_wrap.classList.add('dropdown');
        field_wrap.style.width = '100%';

        field_wrap.append(field_element);

        field_element.setAttribute('list', config['f_list']); 
        if ('options' in data && config['f_list'] in data['options']) {
            // console.log(data['options']);
            const list_element = document.createElement('datalist');
            list_element.classList.add('dropdown-list');
            list_element.setAttribute('id', config['f_list']);
            data['options'][config['f_list']].forEach(option_val => {
                const option_element = document.createElement('option');
                option_element.value = option_val[config['f_option_val']];
                option_element.text = option_val[config['f_option_text']];
                list_element.append(option_element);
                option_element.onclick = () => {
                    field_element.intended_value = option_element.value;
                    field_element.value = option_element.text;
                    list_element.style.display = 'none';
                }

                if (config['f_id'] in data && data[config['f_id']] == option_element.value) {
                    field_element.intended_value = option_element.value;
                    field_element.value = option_element.text;
                }
            });

            field_wrap.append(list_element);
            // field_element.onmouseover = () => {
            //     list_element.style.display = 'block';
            // }
            list_element.onmouseleave = () => {
                list_element.style.display = 'none';
            }
            field_element.onkeyup = () => {
                let filter, options, i;
                filter = field_element.value.toUpperCase();
                options = list_element.getElementsByTagName("option")
                list_element.style.display = 'block';
                
                // console.log(filter, list_element);
                for (i=0;i<options.length;i++) {
                    // console.log(filter, options[i].text);
                    if (options[i].text.toUpperCase().indexOf(filter) > -1) {
                        options[i].style.display = "";
                    } else {
                        options[i].style.display = "none";
                    }
                }
            }
        }
    }

    if ('f_list' in config && config['f_element'] == 'select') {
        if ('options' in data && config['f_list'] in data['options']) {
            // console.log(data['options']);
            
            data['options'][config['f_list']].forEach(option_val => {
                const option_element = document.createElement('option');
                option_element.value = option_val[config['f_option_val']];
                option_element.text = option_val[config['f_option_text']];
                field_element.append(option_element);

                if ('f_default_val' in config && option_element.value === config['f_default_val']) {
                    option_element.setAttribute('selected', true);
                }

                if (config['f_id'] in data && data[config['f_id']] == option_element.value) {
                    option_element.setAttribute('selected', true);
                }
            });
        }
    }

    field_element.classList.add('mr-1');

    // let wrap_elemnet = null;
    // if ('f_label' in config && config['f_tag'] == 'input') {
    //     wrap_elemnet = document.createElement('label');
    //     wrap_elemnet.setAttribute('for', config['f_id']);
    //     wrap_elemnet.innerText = config['f_label'];
    //     // wrap_elemnet.innerText = field['f_label'];
    //     if ('f_id' in config && config['f_id'] in data) { 
    //         wrap_elemnet.value = data[config['f_id']]; 
    //     }
    //     field_element.classList.add('ml-1');
    //     wrap_elemnet.append(field_element);
    //     // console.log(wrap_elemnet);
    // }

    // return wrap_elemnet?wrap_elemnet:(field_wrap?field_wrap:field_element);
    const data_field = field_wrap?field_wrap:field_element;
    // data_field.classList.add("right");
    p.append(field_label, data_field);
    p.classList.add('line_display');
    return p
}

export { element_build }