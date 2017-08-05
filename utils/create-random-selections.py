import glob, random, os, json

n_outfiles = 25000
selections_per_outfile = 50

captions = json.load(open('../data/full-captions.json'))

all_files = glob.glob('../data/captioned_nearest_neighbors/*.json')

for i in range(n_outfiles):
  with open('../data/captioned_random_selections/' + str(i) + '.json','w') as out:
    selection = set()
    while len(selection) < selections_per_outfile:
      img = os.path.basename( random.choice(all_files) ).replace('.json','.jpg')
      if os.path.exists('../assets/images/thumbs/' + img):
        selection.add(img)

    json_selection = []
    for k in selection:
      try:
        caption = captions[k.replace('.jpg','')]
      except KeyError:
        caption = ''

      json_selection.append({
        'image': k,
        'caption': caption
      })

    json.dump(json_selection, out)     
