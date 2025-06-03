import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, NativeSyntheticEvent, NativeScrollEvent, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import { CalendarEvent } from '../../types';
import { EventCard } from './EventCard';

interface WeekViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onDatePress?: (date: Date) => void;
  onEventPress?: (event: CalendarEvent) => void;
  userColors?: Record<string, string>;
}

export function WeekView({ selectedDate, events, onDatePress, onEventPress, userColors }: WeekViewProps) {
  const { width } = Dimensions.get('window');
  const baseTimeColumnWidth = 80;
  const baseHourHeight = 120;
  
  // Zoom state
  const [scale, setScale] = useState(1);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const lastScale = useRef(1);
  const currentGestureScale = useRef(1);
  
  // Static calculations for layout - no animation on these
  const timeColumnWidth = baseTimeColumnWidth * scale;
  const hourHeight = baseHourHeight * scale;
  const dayWidth = (width - baseTimeColumnWidth - 32) / 7 * scale;

  const headerScrollViewRef = useRef<ScrollView>(null);
  const contentScrollViewRef = useRef<ScrollView>(null);
  const verticalScrollViewRef = useRef<ScrollView>(null);
  const ignoreNextHeaderScroll = useRef(false);
  const ignoreNextContentScroll = useRef(false);

  // Animation for time column
  const timeColumnAnim = useRef(new Animated.Value(-timeColumnWidth)).current;

  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: true,
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Scroll to 7am immediately (before animation starts)
    setTimeout(() => {
      verticalScrollViewRef.current?.scrollTo({ 
        y: 7 * hourHeight,
        animated: false 
      });
    }, 50);

    // Then animate time column in
    setTimeout(() => {
      Animated.timing(timeColumnAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 100);
  }, []);

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const targetDate = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventStart = new Date(event.start_date).toISOString().split('T')[0];
      const eventEnd = new Date(event.end_date).toISOString().split('T')[0];
      return targetDate >= eventStart && targetDate <= eventEnd;
    });
  };

  const isToday = (date: Date) => {
    return date.toDateString() === currentTime.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const getUserColor = (userId?: string) => {
    return userId && userColors ? userColors[userId] : undefined;
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return (hours * hourHeight) + (minutes / 60 * hourHeight);
  };

  const getCurrentTimeText = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const shouldFadeHourMark = (hour: number) => {
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;
    const hourTimeInMinutes = hour * 60;
    
    // Fade if within 15 minutes of the hour mark
    return Math.abs(currentTimeInMinutes - hourTimeInMinutes) <= 15;
  };

  const getHourMarkOpacity = (hour: number) => {
    const currentTimePos = getCurrentTimePosition();
    const hourTextPos = hour * hourHeight + 12; // Account for paddingTop + text height offset
    const distance = Math.abs(currentTimePos - hourTextPos);
    const ovalHeight = 40; // Approximate height of the oval
    const fadeDistance = 60; // Start fading when within 60px
    
    if (distance > fadeDistance) {
      return 1; // Full opacity when far away
    }
    
    if (distance < ovalHeight / 2) {
      return 0.1; // Almost invisible when very close/overlapping
    }
    
    // Gradual fade between fadeDistance and ovalHeight/2
    const fadeRange = fadeDistance - (ovalHeight / 2);
    const fadeAmount = (distance - (ovalHeight / 2)) / fadeRange;
    return Math.max(0.1, Math.min(1, fadeAmount));
  };

  const weekDays = getWeekDays(selectedDate);
  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const updateScrollState = (scrollX: number, contentWidth: number, layoutWidth: number) => {
    const canScrollLeft = scrollX > 5;
    const canScrollRight = scrollX < contentWidth - layoutWidth - 5;
    
    setScrollState({ canScrollLeft, canScrollRight });
  };

  const onHeaderScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (ignoreNextHeaderScroll.current) {
      ignoreNextHeaderScroll.current = false;
      return;
    }
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollX = contentOffset.x;
    
    updateScrollState(scrollX, contentSize.width, layoutMeasurement.width);
    
    ignoreNextContentScroll.current = true;
    contentScrollViewRef.current?.scrollTo({ x: scrollX, animated: false });
  };

  const onContentScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (ignoreNextContentScroll.current) {
      ignoreNextContentScroll.current = false;
      return;
    }
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollX = contentOffset.x;
    
    updateScrollState(scrollX, contentSize.width, layoutMeasurement.width);
    
    ignoreNextHeaderScroll.current = true;
    headerScrollViewRef.current?.scrollTo({ x: scrollX, animated: false });
  };

  // Pinch gesture handler
  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: scaleAnim } }],
    { 
      useNativeDriver: true,
      listener: (event: any) => {
        currentGestureScale.current = lastScale.current * event.nativeEvent.scale;
      }
    }
  );

  const onPinchStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const newScale = Math.max(0.5, Math.min(3, currentGestureScale.current));
      
      // Animate smoothly to the final scale
      Animated.timing(scaleAnim, {
        toValue: newScale,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setScale(newScale);
        lastScale.current = newScale;
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Week header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <View style={[styles.timeColumnHeader, { width: baseTimeColumnWidth }]} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.weekHeaderScrollView}
            contentContainerStyle={styles.weekHeaderContentContainer}
            ref={headerScrollViewRef}
            onScroll={onHeaderScroll}
            scrollEventThrottle={16}
          >
            <Animated.View 
              style={[
                styles.weekHeader,
                {
                  width: (width - baseTimeColumnWidth - 32),
                  transform: [{ scaleX: scaleAnim }]
                }
              ]}
            >
              {weekDays.map((day, index) => {
                const dayEvents = getEventsForDate(day);
                const isCurrentDay = isToday(day);
                const isSelectedDay = isSelected(day);
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayHeader,
                      { width: (width - baseTimeColumnWidth - 32) / 7 },
                      isCurrentDay && styles.todayHeader,
                      isSelectedDay && styles.selectedHeader,
                    ]}
                    onPress={() => onDatePress?.(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayName,
                      isCurrentDay && styles.todayText,
                      isSelectedDay && styles.selectedText,
                    ]}>
                      {weekDayNames[index]}
                    </Text>
                    <Text style={[
                      styles.dayNumber,
                      isCurrentDay && styles.todayText,
                      isSelectedDay && styles.selectedText,
                    ]}>
                      {day.getDate()}
                    </Text>
                    {dayEvents.length > 0 && (
                      <View style={styles.eventIndicator}>
                        <Text style={styles.eventCount}>{dayEvents.length}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          </ScrollView>
        </View>
        
        {/* Right scroll indicator for header */}
        {scrollState.canScrollRight && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.rightScrollIndicator}
            pointerEvents="none"
          />
        )}
      </View>

      {/* Week content with time grid */}
      <View style={styles.contentContainer}>
        <PinchGestureHandler
          onGestureEvent={onPinchEvent}
          onHandlerStateChange={onPinchStateChange}
        >
          <Animated.View style={{ flex: 1 }}>
            <ScrollView
              style={styles.weekContent}
              showsVerticalScrollIndicator={true}
              ref={verticalScrollViewRef}
              contentContainerStyle={{ height: hours.length * hourHeight, paddingTop: 15 }}
            >
              <Animated.View 
                style={{ 
                  height: hourHeight * hours.length,
                  transform: [{ scale: scaleAnim }]
                }}
              >
                <View style={styles.timeGridContainer}>
                  {/* Time column */}
                  <Animated.View 
                    style={[
                      styles.timeColumn, 
                      { 
                        width: baseTimeColumnWidth,
                        transform: [{ translateX: timeColumnAnim }],
                      }
                    ]}
                  >
                    {hours.map((hour) => (
                      <View key={hour} style={[styles.timeSlot, { height: baseHourHeight }]}>
                        <Text 
                          style={[
                            styles.timeText,
                            isToday(selectedDate) && {
                              opacity: getHourMarkOpacity(hour),
                            }
                          ]}
                        >
                          {formatHour(hour)}
                        </Text>
                      </View>
                    ))}
                  </Animated.View>

                  {/* Current time oval - positioned as sibling to time column */}
                  {isToday(selectedDate) && (
                    <View
                      style={[
                        styles.currentTimeOval,
                        {
                          top: getCurrentTimePosition() / scale - 20,
                          left: 5,
                        },
                      ]}
                    >
                      <Text style={styles.currentTimeText}>
                        {getCurrentTimeText()}
                      </Text>
                    </View>
                  )}

                  {/* Days with horizontal scroll */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    ref={contentScrollViewRef}
                    onScroll={onContentScroll}
                    scrollEventThrottle={16}
                    style={styles.daysScrollView}
                    contentContainerStyle={{ width: (width - baseTimeColumnWidth - 32) }}
                  >
                    <View style={[styles.daysGridContainer, { 
                      width: (width - baseTimeColumnWidth - 32), 
                      height: baseHourHeight * hours.length
                    }]}>
                      {/* Grid lines */}
                      <View style={styles.gridLines}>
                        {hours.map((hour) => (
                          <View
                            key={hour}
                            style={[
                              styles.hourLine,
                              { 
                                top: hour * baseHourHeight, 
                                width: (width - baseTimeColumnWidth - 32) 
                              },
                            ]}
                          />
                        ))}
                        {weekDays.map((_, index) => (
                          <View
                            key={index}
                            style={[
                              styles.dayLine,
                              { 
                                left: index * (width - baseTimeColumnWidth - 32) / 7, 
                                height: baseHourHeight * hours.length
                              },
                            ]}
                          />
                        ))}
                      </View>

                      {/* Current time indicator */}
                      {isToday(selectedDate) && (
                        <View
                          style={[
                            styles.currentTimeLine,
                            {
                              top: getCurrentTimePosition() / scale,
                              left: -baseTimeColumnWidth,
                              width: (width - baseTimeColumnWidth - 32) + baseTimeColumnWidth,
                            },
                          ]}
                        />
                      )}

                      {/* Days container */}
                      <View style={styles.daysContainer}>
                        {weekDays.map((day, index) => {
                          const dayEvents = getEventsForDate(day).sort((a, b) => 
                            new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
                          );
                          
                          return (
                            <View key={index} style={[styles.dayColumn, { width: (width - baseTimeColumnWidth - 32) / 7 }]}>
                              {dayEvents.map((event) => (
                                <View key={event.id} style={styles.eventWrapper}>
                                  <EventCard
                                    event={event}
                                    onPress={onEventPress}
                                    compact
                                    userColor={getUserColor(event.user_id)}
                                  />
                                </View>
                              ))}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </Animated.View>
            </ScrollView>
          </Animated.View>
        </PinchGestureHandler>
        
        {/* Right scroll indicator for content */}
        {scrollState.canScrollRight && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.rightScrollIndicatorContent}
            pointerEvents="none"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    position: 'relative',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerRow: {
    flexDirection: 'row',
  },
  timeColumnHeader: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  weekHeaderScrollView: {
    flex: 1,
  },
  weekHeaderContentContainer: {
    flexDirection: 'row',
  },
  weekHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    position: 'relative',
  },
  todayHeader: {
    backgroundColor: '#E3F2FD',
  },
  selectedHeader: {
    backgroundColor: '#007AFF',
  },
  dayName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  dayNumber: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
  },
  todayText: {
    color: '#007AFF',
  },
  selectedText: {
    color: '#fff',
  },
  eventIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  weekContent: {
    flex: 1,
  },
  timeGridContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  timeColumn: {
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  timeSlot: {
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
    position: 'relative',
  },
  timeText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: -5,
  },
  daysScrollView: {
    flex: 1,
  },
  daysGridContainer: {
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  hourLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#d0d0d0',
  },
  dayLine: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#d0d0d0',
  },
  currentTimeLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#FF3B30',
    zIndex: 10,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  currentTimeOval: {
    position: 'absolute',
    backgroundColor: '#FF3B30',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 20,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  currentTimeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  daysContainer: {
    flexDirection: 'row',
    paddingTop: 8,
  },
  dayColumn: {
    paddingHorizontal: 4,
  },
  eventWrapper: {
    marginBottom: 4,
  },
  rightScrollIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 20,
    zIndex: 1,
  },
  rightScrollIndicatorContent: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 20,
    zIndex: 1,
  },
}); 