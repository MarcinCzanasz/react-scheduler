import { useEffect, useCallback, Fragment } from "react";
import { useTheme, Paper, Typography } from "@material-ui/core";
import {
  format,
  eachMinuteOfInterval,
  addHours,
  isSameDay,
  differenceInMinutes,
  differenceInDays,
  isToday,
  isWithinInterval,
  setHours,
  setMinutes,
  isBefore,
  isAfter,
  addMinutes,
  startOfDay,
  endOfDay,
  addDays,
} from "date-fns";
import TodayTypo from "../components/common/TodayTypo";
import EventItem from "../components/events/EventItem";
import { useAppState } from "../hooks/useAppState";
import { DayHours, DefaultRecourse, ProcessedEvent } from "../Scheduler";
import { getResourcedEvents } from "../helpers/generals";
import { WithResources } from "../components/common/WithResources";

export interface DayProps {
  startHour: DayHours;
  endHour: DayHours;
}

const Day = () => {
  const {
    day,
    selectedDate,
    events,
    height,
    triggerDialog,
    remoteEvents,
    triggerLoading,
    handleState,
    resources,
    resourceFields,
    fields,
    direction,
    locale,
  } = useAppState();
  const { startHour, endHour } = day!;
  const HOUR_STEP = 60;
  const START_TIME = setMinutes(setHours(selectedDate, startHour), 0);
  const END_TIME = setMinutes(setHours(selectedDate, endHour), 0);
  const hours = eachMinuteOfInterval(
    {
      start: START_TIME,
      end: END_TIME,
    },
    { step: HOUR_STEP }
  );
  const CELL_HEIGHT = height / hours.length;
  const MINUTE_HEIGHT = (Math.ceil(CELL_HEIGHT) * 1.042) / HOUR_STEP;
  const todayEvents = events.sort((b, a) => a.end.getTime() - b.end.getTime());
  const theme = useTheme();

  const fetchEvents = useCallback(async () => {
    try {
      triggerLoading(true);
      const start = addDays(START_TIME, -1);
      const end = addDays(END_TIME, 1);
      const query = `?start=${start}&end=${end}`;
      const events = await remoteEvents!(query);
      if (events && events?.length) {
        handleState(events, "events");
      }
    } catch (error) {
      throw error;
    } finally {
      triggerLoading(false);
    }
    // eslint-disable-next-line
  }, [selectedDate]);

  useEffect(() => {
    if (remoteEvents instanceof Function) {
      fetchEvents();
    }
  }, [fetchEvents, remoteEvents]);

  const renderMultiDayEvents = (events: ProcessedEvent[]) => {
    const SPACE = 28;
    const multiDays = events.filter(
      (e) =>
        differenceInDays(e.end, e.start) > 0 &&
        isWithinInterval(selectedDate, {
          start: startOfDay(e.start),
          end: endOfDay(e.end),
        })
    );

    return (
      <div className="events_col" style={{ height: SPACE * multiDays.length }}>
        {multiDays.map((event, i) => {
          const hasPrev = isBefore(event.start, startOfDay(selectedDate));
          const hasNext = isAfter(event.end, endOfDay(selectedDate));
          return (
            <Paper
              key={event.event_id}
              className="allday_event event__item"
              style={{
                top: i * SPACE,
                width: "100%",
                background: event.color || theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
              }}
            >
              <EventItem
                event={event}
                multiday
                hasPrev={hasPrev}
                hasNext={hasNext}
              />
            </Paper>
          );
        })}
      </div>
    );
  };

  const renderTodayEvents = (events: ProcessedEvent[]) => {
    const crossingIds: Array<number | string> = [];
    const todayEvents = events.filter(
      (e) =>
        !differenceInDays(e.end, e.start) && isSameDay(selectedDate, e.start)
    );

    return (
      <div className="events_col">
        {todayEvents.map((event, i) => {
          const height =
            differenceInMinutes(event.end, event.start) * MINUTE_HEIGHT;
          const top =
            differenceInMinutes(event.start, START_TIME) * MINUTE_HEIGHT;
          const withinSameDay = todayEvents.filter(
            (e) =>
              e.event_id !== event.event_id &&
              (isWithinInterval(addMinutes(event.start, 1), {
                start: e.start,
                end: e.end,
              }) ||
                isWithinInterval(addMinutes(event.end, -1), {
                  start: e.start,
                  end: e.end,
                }))
          );

          const alreadyRendered = withinSameDay.filter((e) =>
            crossingIds.includes(e.event_id)
          );
          crossingIds.push(event.event_id);

          return (
            <div key={event.event_id}>
              <Paper
                className="event__item"
                style={{
                  height: height,
                  top: top,
                  width: withinSameDay.length
                    ? `${100 / (withinSameDay.length + 1) + 10}%`
                    : "",
                  left: alreadyRendered.length
                    ? `${
                        alreadyRendered.length *
                        (100 / (alreadyRendered.length + 1.7))
                      }%`
                    : "",
                  background: event.color || theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                }}
              >
                <EventItem event={event} />
              </Paper>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTable = (resource?: DefaultRecourse) => {
    let recousedEvents = todayEvents;
    if (resource) {
      recousedEvents = getResourcedEvents(
        todayEvents,
        resource,
        resourceFields,
        fields
      );
    }

    return (
      <Fragment>
        <tr>
          <td className="day_indent borderd"></td>
          <td className="borderd">
            <table className="week_day_table">
              <tbody>
                <tr>
                  <td
                    className={isToday(selectedDate) ? "today_cell" : ""}
                    style={{ border: 0 }}
                  >
                    <TodayTypo date={selectedDate} />
                    {renderMultiDayEvents(recousedEvents)}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td className="borderd">
            <table className="hour_table">
              <thead>
                <tr>
                  <td></td>
                </tr>
              </thead>
              <tbody>
                {hours.map((h, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ height: CELL_HEIGHT }}>
                        <Typography variant="caption">
                          {format(h, "hh:mm a", { locale: locale })}
                        </Typography>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
          <td className="borderd">
            <table className="cells_table">
              <style>{`
              .cells_table tr:last-child td {
                border-width: ${
                  direction === "rtl" ? "0 1px 0 0" : "0 0 0 1px"
                };
              }
              .cells_table td:first-child {
                border-${direction === "rtl" ? "right" : "left"}: 0;
              }
              `}</style>
              <thead>
                <tr>
                  <td>{renderTodayEvents(recousedEvents)}</td>
                </tr>
              </thead>
              <tbody>
                {hours.map((h, i) => (
                  <tr key={i}>
                    <td
                      onClick={(e) => {
                        const start = new Date(
                          `${format(selectedDate, "yyyy MM dd")} ${format(
                            h,
                            "hh:mm a"
                          )}`
                        );
                        const end = new Date(
                          `${format(selectedDate, "yyyy MM dd")} ${format(
                            addHours(h, 1),
                            "hh:mm a"
                          )}`
                        );
                        const field = resourceFields.idField;
                        triggerDialog(true, {
                          start,
                          end,
                          [field]: resource ? resource[field] : null,
                        });
                      }}
                      className={isToday(selectedDate) ? "today_cell" : ""}
                    >
                      <div
                        className="c_cell"
                        style={{ height: CELL_HEIGHT }}
                      ></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      </Fragment>
    );
  };

  return (
    <tbody className="borderd">
      {resources.length ? (
        <WithResources span={2} renderChildren={renderTable} />
      ) : (
        renderTable()
      )}
    </tbody>
  );
};

export { Day };
