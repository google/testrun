FROM python:3.12-alpine

RUN apk add -u pango gdk-pixbuf msttcorefonts-installer fontconfig zopfli font-dejavu\
    && update-ms-fonts && fc-cache -f

# # copy source code
COPY modules/pdf/python /usr/src/app/python

# install python dependencies
RUN pip3 install -r /usr/src/app/python/requirements.txt

#set work directory
WORKDIR /usr/src/app/python/src

EXPOSE 8001

CMD ["gunicorn", "--bind", "0.0.0.0:8001", "app:app"]