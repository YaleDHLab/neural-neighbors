import json, glob, os

captions = json.load(open('../data/full-captions.json'))

for i in glob.glob('../data/nearest_neighbors/*.json'):
  with open(i) as f:
    j = json.load(f)
    for k in j:
      try:
        k['caption'] = captions[k['filename']]
      except:
        k['caption'] = ''

  with open('../data/captioned_nearest_neighbors/' + os.path.basename(i), 'w') as out:
    json.dump(j, out)
