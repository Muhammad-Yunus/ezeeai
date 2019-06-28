function _(el) {
    return $('#' + el);
}

/* ---- Tabular test file ---- */


function uploadCSVFile($input) {
    if (validateSize()){
        let filename = document.getElementById('tabular-upload').files[0].name.split('.')[0];
        let f = new FormData();
        f.append('input_file', $input.files[0], $input.files[0].name);
        f.append('model_name', $('#model_name').val());

        ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function () {
            if (this.readyState === 4 && JSON.parse(this.response).result !== 'ok') {
                _("status_tabular").text("Upload Failed");
                _("loaded_n_total_tabular").text("");
                alert('Upload failed: invalid data format');
                document.getElementById('progressBar_tabular').style.width = 0;
            }
            else if (this.readyState === 4 && JSON.parse(this.response).result === 'ok') {
                upload_test_table(document.getElementById('tabular-upload').files[0].name);
                _("status_tabular").text("Complete! 100% uploaded.");
                document.getElementById('progressBar_tabular').style.width = 100;
                $.notify("New test saved : " + filename, "success");
            }

        };
        ajax.upload.addEventListener("progress", progressHandlerTabular, false);
        ajax.addEventListener("error", errorHandlerTabular, false);
        ajax.addEventListener("abort", abortHandlerTabular, false);

        ajax.open("POST", "/upload_test_file");
        ajax.send(f);
    }
}


function progressHandlerTabular(event) {
    $('#progressBar_tabular').removeClass('invisible');
    _("loaded_n_total_tabular").text("Uploaded " + event.loaded + " bytes of " + event.total);
    let percent = (event.loaded / event.total) * 100;
    percent = Math.round(percent);
    document.getElementById('progressBar_tabular').style.width = percent.toString() + "%";
    _("status_tabular").text(percent + "% uploaded... please wait");
    if (percent === 100) {
        $('#tabular-upload').prev('.custom-file-label').html('Choose file')
            .val('');
    }
}

function errorHandlerTabular(event) {
    _("status_tabular").text("Upload Failed");
    _("loaded_n_total_tabular").text("");
    document.getElementById('progressBar_tabular').style.width = 0;
}

function abortHandlerTabular(event) {
    _("status_tabular").text("Upload Aborted");
    _("loaded_n_total_tabular").text("");
    document.getElementById('progressBar_tabular').style.width = 0;
}


function deleteTestFile(elem) {
    let message = "Are you sure you want to delete the selected test file? (It will not be available for other model)";
    if (confirm(message)) {
        $.ajax({
            url: "/delete_test_file",
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json;charset=UTF-8',
            accepts: {
                json: 'application/json',
            },
            data: JSON.stringify({'filename': $(elem).attr('data-id'), 'model_name': $('#model_name').val()}),
            success: function (data) {
                if (data.error) {
                    alert(data.mess)
                } else {
                    $.notify('Test file ' + $(elem).attr('data-id') + ' removed', 'success');
                    $('#table_test_files').DataTable().rows({selected: true}).remove().draw();
                }
            }
        })
    }
}

function clean_upload_log() {
    _("status_tabular").text("");
    document.getElementById('progressBar_tabular').style.width = 0;
    _("loaded_n_total_tabular").text("");

    _("status_image").text("");
    document.getElementById('progressBar_image').style.width = 0;
    _("loaded_n_total_image").text("");
}


function validateSize() {
    var file_size = $('#tabular-upload')[0].files[0].size / 1024 / 1024; // in MB
    if (file_size > 2) {
        alert('File size exceeds 2 MB');
        return false;
    }
    return true;
}


// function completeHandlerImage(event) {
//     _("status_image").text("100% uploaded.");
//
// }


// function uploadCSVFile($input) {
//     let filename = document.getElementById('tabular-upload').files[0].name;
//     let fReader = new FileReader();
//     fReader.readAsBinaryString($input.files[0]);
//     $('#status_tabular').text('Uploading file...')
//     $('#loaded_n_total_tabular').text('0%')
//     fReader.onloadend = function (event) {
//         $.ajax({
//             url: "/upload_test_file",
//             type: 'POST',
//             dataType: 'json',
//             contentType: 'application/json;charset=UTF-8',
//             accepts: {
//                 json: 'application/json',
//             },
//             data: JSON.stringify({
//                 'file': event.target.result,
//                 'model_name': $('#model_name').val(),
//                 'filename': filename
//             }),
//             success: function (data) {
//                 if (data.result !== 'ok') {
//                     alert(data.result);
//                     $('#status_tabular').text('');
//                     $('#loaded_n_total_tabular').text('');
//                 }
//                 else {
//                     upload_test_table(filename);
//                     $.notify("File saved", "success");
//                     document.getElementById('progressBar_tabular').style.width = "100%";
//                     $('#tabular-upload').val('')
//                     $('#test_file').prev('.custom-file-label').html('Choose file');
//
//                     $('#status_tabular').text('Upload complete.');
//                     $('#loaded_n_total_tabular').text('100%')
//                 }
//
//             },
//             error: function (e) {
//                 $.notify("File error", "error");
//             }
//         })
//     }
// }
