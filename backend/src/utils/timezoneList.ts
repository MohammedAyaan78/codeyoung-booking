import { TimezoneOption } from '@codeyoung/shared';
import { DateTime } from 'luxon';

/**
 * Curated list of IANA timezones with human-readable labels.
 * Covers the most common zones for a global education platform.
 */
export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: 'Pacific/Honolulu',      label: 'Honolulu — Pacific/Honolulu'           },
  { value: 'America/Anchorage',     label: 'Anchorage — America/Anchorage'         },
  { value: 'America/Los_Angeles',   label: 'Los Angeles — America/Los_Angeles'     },
  { value: 'America/Denver',        label: 'Denver — America/Denver'               },
  { value: 'America/Chicago',       label: 'Chicago — America/Chicago'             },
  { value: 'America/New_York',      label: 'New York — America/New_York'           },
  { value: 'America/Sao_Paulo',     label: 'São Paulo — America/Sao_Paulo'         },
  { value: 'Europe/London',         label: 'London — Europe/London'                },
  { value: 'Europe/Paris',          label: 'Paris — Europe/Paris'                  },
  { value: 'Europe/Berlin',         label: 'Berlin — Europe/Berlin'                },
  { value: 'Europe/Moscow',         label: 'Moscow — Europe/Moscow'                },
  { value: 'Asia/Dubai',            label: 'Dubai — Asia/Dubai'                    },
  { value: 'Asia/Kolkata',          label: 'Bengaluru / Mumbai — Asia/Kolkata'     },
  { value: 'Asia/Dhaka',            label: 'Dhaka — Asia/Dhaka'                    },
  { value: 'Asia/Bangkok',          label: 'Bangkok — Asia/Bangkok'                },
  { value: 'Asia/Singapore',        label: 'Singapore — Asia/Singapore'            },
  { value: 'Asia/Shanghai',         label: 'Shanghai — Asia/Shanghai'              },
  { value: 'Asia/Tokyo',            label: 'Tokyo — Asia/Tokyo'                    },
  { value: 'Australia/Sydney',      label: 'Sydney — Australia/Sydney'             },
  { value: 'Pacific/Auckland',      label: 'Auckland — Pacific/Auckland'           },
].map((tz) => ({
  ...tz,
  offset: DateTime.now().setZone(tz.value).toFormat('ZZ'),
}));
