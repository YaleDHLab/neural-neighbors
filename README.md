# TSNE Image Browser

This repository hosts source code used to create a similar image browser. Users can mouse over images to identify similar images, or click on images to read more information about the particular photograph.

![App preview](/assets/images/preview.png?raw=true)

## Dependencies

The scripts in `utils/` are written in pure Python (3.5). The image resizing utilities require ImageMagick.

## Quickstart

You can start a local web server and see the application by running:

```
git clone https://github.com/YaleDHLab/neural-neighbors
cd neural-neighbors

wget https://s3-us-west-2.amazonaws.com/lab-apps/meserve-kunhardt/image-browser/data.tar.gz
tar -zxf data.tar.gz

# Python 3
python -m http.server 7052

# Python 2
python -m SimpleHTTPServer 7052
```

The viewer will then be available on `localhost:7052`.