#!/usr/bin/python3

import json
import requests
import os


session = requests.Session()

def retrieveData(pUrl, pParams = {}):
  request = session.get(url = pUrl, params = pParams)

  if request.status_code != 200:
    print('Error: Status code', request.status_code, 'for', url)
  
  return request

current_directory = os.getcwd()
print(current_directory)
img_directory = 'resources/icons'
if not os.path.exists(img_directory):
	os.makedirs(img_directory)
	
limit = 500

request = retrieveData(
	pUrl = 'https://gbf.wiki/api.php',
	pParams = {
	'action': 'cargoquery',
	'tables': 'characters',
	'fields': 'COUNT(characters.id)=total',
	'format': 'json',
	'limit': limit,
	})
      
request_json = request.json()
    
total_chars = int(request_json['cargoquery'][0]['title']['total'])

print('Total Characters: ' + str(total_chars))
    
offset = 0

while offset < total_chars:
	request = retrieveData(
		pUrl = 'https://gbf.wiki/api.php',
		pParams = {
			'action': 'cargoquery',
			'tables': 'characters',
			'fields': 'id, _pageTitle = name',
			'format': 'json',
			'limit': limit,
			'offset': offset
	})
	
	request_json = request.json()
	
	for result in request_json['cargoquery']:
		char_data = result['title']
		char_id = char_data['id']
		img_path = os.path.join(img_directory, char_id + '_icon.jpg')
		
		
		if os.path.isfile(img_path):
			print(img_path + ' already exists...skipping')
		else:
			print(img_path + '... retrieving...')
		    url = 'http://game-a.granbluefantasy.jp/assets_en/img_mid/sp/assets/npc/m/' + char_id + '_01.jpg'
		    response = requests.get(url)
		    
		    if response.ok:
		    	with open(img_path, "wb") as image_file:
		    		image_file.write(response.content)
		    else:
		    	print('Failed to load ' + url)
		
	offset += limit