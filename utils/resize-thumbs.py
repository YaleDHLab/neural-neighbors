import glob, os

for i in glob.glob('../assets/images/thumbs/*.jpg'):
  os.system('convert ' + i + ' -sampling-factor 4:2:0 -quality 85 ../assets/images/resized/' + os.path.basename(i))
