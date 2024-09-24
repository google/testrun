FROM python:3.12-alpine

# Fonts path
ARG FONTS_PATH=/usr/local/fonts/
ENV FONTS_PATH=$FONTS_PATH

RUN apk --no-cache add pango-dev ttf-dejavu

# Copy source code
COPY modules/pdf/python /usr/src/app/python

# Copy local fonts into the container
COPY modules/pdf/fonts $FONTS_PATH

# install python dependencies
RUN pip3 install -r /usr/src/app/python/requirements.txt

#set work directory
WORKDIR /usr/src/app/python/src

EXPOSE 8001

CMD ["gunicorn", "--bind", "0.0.0.0:8001", "app:app"]