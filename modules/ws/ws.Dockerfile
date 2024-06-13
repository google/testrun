FROM eclipse-mosquitto:1.4.12
RUN mkdir -p /mosquitto/data/
COPY modules/ws/conf/mosquitto.conf /mosquitto/config/mosquitto.conf
VOLUME /mosquitto/data/