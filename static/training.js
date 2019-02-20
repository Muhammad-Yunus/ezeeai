var playing = false;

$(document).ready(function () {
    $('.widget').widgster();
    var collapsed = $("a[data-widgster='collapse']");
    collapsed.click();

    draw_models_select(appConfig.handle_key.models, appConfig.handle_key.datasets);
    if (appConfig.handle_key.running) {
        playing = true;
        toggle_play();
        enable_run();
        disable_run_config();
    }

    if (appConfig.handle_key.model_name !== '') {
        $('#model_name').val(appConfig.handle_key.model_name);
        enable_run();
        $('.waiting-selection').addClass('hide-element');
        $('.visualization').removeClass('hide-element');
    }
    update_graphs(appConfig.handle_key.graphs, true);


    $('#model_name').on('change', function () {
        enable_run();
        $('.waiting-selection').addClass('hide-element');
        $('.loader').removeClass('hide-element');
        $.ajax({
            url: "/params_run",
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json;charset=UTF-8',
            data: JSON.stringify({'model_name': $(this).val()}),
            success: function (data) {

                $('.loader').addClass('hide-element');
                $('.visualization').removeClass('hide-element');
                update_parameters_form(data.parameters);
                update_checkpoint_table(data.checkpoints, data.metric);
                update_graphs(data.graphs, true);
            }
        })
    });

    setInterval(function () {
        if (playing) {
            $.ajax({
                url: "/refresh",
                type: 'GET',
                success: function (data) {
                    set_epochs(data.epochs);
                    if (playing !== data.running) {
                        playing = data.running;
                        toggle_play();
                        enable_run_config();
                    }
                    update_checkpoint_table(data.checkpoints, '');
                    update_graphs(data.graphs, false);
                    $('.log').append(data.data).scrollTop($('.log')[0].scrollHeight);
                }
            })
        }
    }, 1000);


});

function draw_models_select(models, datasets) {
    let label = $('<label></label>');
    label.addClass('control-label');
    label.html('<b> Model </b>');


    let select = $("<select></select>")
        .attr('id', 'model_name')
        .attr('name', 'model_name');
    select.addClass('form-control');

    let option_list = Object.keys(models).map((key) => $('<option>').val(key).text(key));
    option_list.unshift($('<option disabled selected value> Please select an option </option>'));
    select.append(option_list);

    $('#models-select-div').append(label)
        .append(select);

}

function enable_run() {
    $('#run_div').removeClass('disabled-custom');
    $('#train_results').removeClass('disabled-custom');

    $('.visualization').addClass('hide-element');

}

function enable_run_config() {
    $('#run_config_div').removeClass('disabled-custom');
}

function disable_run_config() {
    $('#run_config_div').addClass('disabled-custom');

}

function button_play() {

    playing = !playing;

    let formData = new FormData($('#parameters_form')[0]);
    let action = 'pause';
    if (playing)
        action = 'run';

    formData.append('action', action);
    formData.append('resume_from', '');
    playing = !playing;

    // form_data['resume_from'] = '';
    // if (document.getElementById("resume_training").checked === true)
    //     form_data['resume_from'] = get_checkpoint_selected();
    $.ajax({
        url: "/run",
        type: 'POST',
        processData: false,
        contentType: false,
        data: formData,
        success: function (data) {
            //TODO if error not playing = !playing
            playing = !playing;
            toggle_play();
            if (playing) {
                disable_run_config();
            } else {
                enable_run_config();
            }
        }
    });

}

function toggle_play() {
    let animation = playing ? 'stop' : 'play';
    $('#animate_to_' + animation).get(0).beginElement();
}

function set_epochs(val) {
    if (val !== null) {
        let str = val.toString().padStart(6, "0");
        let txt = str.slice(0, 3) + ',' + str.slice(3);
        $("#iter-number").text(txt);
    }
}

function update_parameters_form(params) {
    $('#experiment-keep_checkpoint_max').val(params['keep_checkpoint_max']);
    $('#experiment-save_checkpoints_steps').val(params['save_checkpoints_steps']);
    $('#experiment-save_summary_steps').val(params['save_summary_steps']);
    $('#experiment-throttle').val(params['throttle']);

    $('#training-num_epochs').val(params['num_epochs']);
    $('#training-batch_size').val(params['batch_size']);
    $('#training-optimizer').val(params['optimizer']);
    $('#training-learning_rate').val(params['learning_rate']);
}


function update_graphs(data, from_scratch) {
    if (from_scratch) {
        $('#loss_graph').children().remove();
        $('#metric_graph').children().remove();
    }

    if (!data.hasOwnProperty('train'))
        return;

    let keys = Object.keys(data.train);

    for (var i = 0; i < keys.length; i++) {
        if (keys[i] === 'steps')
            continue;
        let div = 'loss_graph';

        if (keys[i] !== 'loss') {
            div = 'metric_graph'
        }
        line_plot_2_variables(div, data.train.steps, data.train[keys[i]], data.eval.steps, data.eval[keys[i]], 'train', 'val', 'steps', '');

    }

}


function ConfirmDelete(elem, all) {
    let message = "Are you sure you want to delete the selected checkpoint?";
    if (all === true) {
        message = "Are you sure you want to delete all saved checkpoints?";
    }
    if (confirm(message)) {
        $.ajax({
            url: "/delete",
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json;charset=UTF-8',
            accepts: {
                json: 'application/json',
            },
            data: JSON.stringify({'deleteID': $(elem).attr('data-id')}),
            success: function (data) {
                update_checkpoint_table(data.checkpoints, '');
                if (all) {
                    $('#loss_graph').children().remove();
                    $('#metric_graph').children().remove();
                }

            }
        })
    }
}