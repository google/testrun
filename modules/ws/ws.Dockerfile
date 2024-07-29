FROM eclipse-mosquitto:2.0.18
RUN mkdir -p /mosquitto/data/
COPY modules/ws/conf/mosquitto.conf /mosquitto/config/mosquitto.conf
VOLUME /mosquitto/data/