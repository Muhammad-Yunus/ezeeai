import configparser
import shutil

import dill as pickle
import os
from werkzeug.utils import secure_filename

from data.image import find_image_files_folder_per_class, find_image_files_from_file
from utils import upload_util, sys_ops
from utils.sys_ops import create_split_folders, check_zip_file, unzip, tree_remove, check_numpy_file

option_map = {'option1': '.images1', 'option2': '.images2', 'option3': '.images3'}


def get_datasets(app_root, username):
    return [x for x in os.listdir(os.path.join(app_root, 'user_data', username, 'datasets')) if x[0] != '.']


def generate_config_name(app_root, username, dataset_name):
    user_configs = []
    if os.path.isdir(os.path.join(app_root, 'user_data', username, 'datasets', dataset_name)):
        user_configs = [a for a in os.listdir(os.path.join(app_root, 'user_data', username, 'datasets', dataset_name))
                        if os.path.isdir(os.path.join(app_root, 'user_data', username, 'datasets', dataset_name, a))]
    new_name = 'config_'
    cont = 1
    while new_name + str(cont) in user_configs:
        cont += 1
    return new_name + str(cont)


def create_config(username, APP_ROOT, dataset, config_name):
    # TODO default_config not exists, not useful
    path = APP_ROOT + '/user_data/' + username + '/' + dataset + '/' + config_name
    os.makedirs(path, exist_ok=True)
    sys_ops.copyfile('config/default_config.ini', path + '/config.ini')
    return path + '/config.ini'


def update_config_dir(config_writer, target):
    config_writer.add_item('PATHS', 'checkpoint_dir', os.path.join(target, 'checkpoints/'))
    config_writer.add_item('PATHS', 'custom_model', os.path.join(target, 'custom'))
    config_writer.add_item('PATHS', 'export_dir', os.path.join(target, 'checkpoints/export/best_exporter'))
    config_writer.add_item('PATHS', 'log_dir', os.path.join(target, 'log/'))
    config_writer.add_item('PATHS', 'tmp_dir', os.path.join(target, 'tmp'))


def create_model(username, APP_ROOT, config_name):
    # TODO default_config not exists, not useful
    path = APP_ROOT + '/user_data/' + username + '/models/' + config_name
    os.makedirs(path, exist_ok=True)
    sys_ops.copyfile('config/default_config.ini', path + '/config.ini')
    return path + '/config.ini'


def define_new_model(APP_ROOT, username, config_writer, model_name):
    # config_name = generate_config_name(APP_ROOT, username, dataset_name)
    target = os.path.join(APP_ROOT, 'user_data', username, 'models', model_name)
    update_config_dir(config_writer, target)
    os.makedirs(target, exist_ok=True)
    os.makedirs(os.path.join(target, 'log/'), exist_ok=True)
    os.makedirs(os.path.join(target, 'tmp'), exist_ok=True)
    create_model(username, APP_ROOT, model_name)
    return model_name


def get_configs_files(app_root, username):
    parameters_configs = {}
    path_models = os.path.join(app_root, 'user_data', username, 'models')
    models = [a for a in os.listdir(path_models) if os.path.isdir(os.path.join(path_models, a))]
    for model in models:
        config = configparser.ConfigParser()
        config.read(os.path.join(path_models, model, 'config.ini'))
        parameters_configs[model] = {}
        if 'BEST_MODEL' in config.sections():
            parameters_configs[model]['perf'] = config.get('BEST_MODEL', 'max_perf')
            parameters_configs[model]['loss'] = config.get('BEST_MODEL', 'min_loss')
        if 'PATHS' in config.sections():
            dataset = pickle.load(open(config.get('PATHS', 'data_path'), 'rb'))
            parameters_configs[model]['dataset'] = dataset.get_name()  # TODO from data object
    return models, parameters_configs


def new_config(train_form_file, test_form_file, APP_ROOT, username):
    ext = train_form_file.filename.split('.')[-1]
    dataset_name = train_form_file.filename.split('.' + ext)[0]
    dataset_name, path = check_dataset_path(APP_ROOT, username, dataset_name)
    sys_ops.save_filename(path, train_form_file, dataset_name)

    open(os.path.join(path, '.tabular'), 'w')

    if not isinstance(test_form_file, str):
        ext = test_form_file.filename.split('.')[-1]
        test_file = test_form_file.filename.split('.' + ext)[0]
        sys_ops.save_filename(os.path.join(path, 'test'), test_form_file, test_file)
    else:
        os.makedirs(os.path.join(path, 'test'), exist_ok=True)
    os.makedirs(os.path.join(path, 'train'), exist_ok=True)
    os.makedirs(os.path.join(path, 'valid'), exist_ok=True)


def check_dataset_path(app_root, username, dataset_name):
    path = os.path.join(app_root, 'user_data', username, 'datasets', dataset_name)
    if os.path.isdir(path):
        dataset_name = upload_util.generate_dataset_name(app_root, username, dataset_name)
        path = os.path.join(app_root, 'user_data', username, 'datasets', dataset_name)
    os.makedirs(path, exist_ok=True)
    return dataset_name, path


def new_image_dataset(app_root, username, option, file):
    if isinstance(file, str):
        return False
    dataset_name = file.filename.split('.')[0]
    dataset_name, dataset_path = check_dataset_path(app_root, username, dataset_name)
    filename = secure_filename(file.filename)
    path_file = os.path.join(dataset_path, filename)
    file.save(path_file)
    open(os.path.join(dataset_path, option_map[option]), 'w')

    if option == 'option3' and not check_numpy_file(path_file):
        tree_remove(dataset_path)
        return False

    if not check_zip_file(path_file):
        tree_remove(dataset_path)
        return False
    else:
        unzip(path_file, dataset_path)
        try:
            if option == 'option1':
                find_image_files_folder_per_class(dataset_path)
            elif option == 'option2':
                info_file = [f for f in os.listdir(dataset_path) if f.startswith('labels.')]
                assert len(info_file) == 1
                find_image_files_from_file(dataset_path, os.path.join(dataset_path, info_file[0]))
        except AssertionError:
            tree_remove(dataset_path)
            return False
    return True

# TODO
# def check_generated(dataset_name, APP_ROOT, username):
#     path = os.path.join(APP_ROOT, 'user_data', username, 'datasets', dataset_name)
#     if not os.path.isdir(path):
#         return False
#     return dataset_name
