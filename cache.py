# cache.py
# python script to cache all files in directory
# Jonah Majumder, 8/29/17

import os

timer_directory = os.getcwd()

excluded_files = ['cache.manifest', 'cache.py', '.git']

def get_files(cd):
    file_string = ''
    file_list = os.listdir(cd)
    for file in file_list:
        full_path = cd + '/' + file
        if not os.path.isdir(full_path):
            if file not in excluded_files:
                file_string += (full_path.replace((timer_directory + '/'), '') + '\n')
    file_string += '\n'
    for file in file_list:
        full_path = cd + '/' + file
        if os.path.isdir(full_path):
            if file not in excluded_files:
                file_string += get_files(full_path)
    return file_string

full_manifest = get_files(timer_directory)

cache_file = open('cache.manifest', 'w')

cache_file.write(full_manifest)

cache_file.close()