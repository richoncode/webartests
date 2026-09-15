// Compile the firmware's own chance model on the host and assert the table.
// chance.h touches neither the network nor the clock, which is what makes this
// possible. The expected values are what chance-model.py produces for the same
// inputs, so this is an equivalence check between the model in the journal and
// the one that ships.
//
//   c++ -std=c++17 -o /tmp/chance-test tools/chance-test.cpp && /tmp/chance-test
#include <cstdio>
#include <cstring>
#include <cstdlib>
#define LAUNCH_PLUME_LAG_MIN 6
#include "../firmware/dashboard/chance.h"

static int fails = 0;
static void check(const char *what, int got, int want) {
  bool ok = got == want;
  if (!ok) fails++;
  printf("  %-38s %3d%%  %s\n", what, got, ok ? "ok" : "MISMATCH");
  if (!ok) printf("      the model in the journal says %d\n", want);
}

int main() {
  const int SUNSET = 19 * 60 + 13, SUNRISE = 6 * 60 + 48;   // San Martin, mid-September
  puts("chance model, clear sky unless stated");
  check("USSF-259 tonight, 18:29, Go",     launchChance(18 * 60 + 29, SUNSET, SUNRISE, 0, "Go"), 10);
  check("18:47 Friday, Go",                launchChance(18 * 60 + 47, SUNSET, SUNRISE, 0, "Go"), 29);
  check("the same, 40% cloud",             launchChance(18 * 60 + 47, SUNSET, SUNRISE, 40, "Go"), 21);
  check("04:42 pre-dawn, TBC",             launchChance(4 * 60 + 42,  SUNSET, SUNRISE, 0, "TBC"), 48);
  check("19:49, half an hour after sunset", launchChance(19 * 60 + 49, SUNSET, SUNRISE, 5, "Go"), 95);
  check("the same, overcast",              launchChance(19 * 60 + 49, SUNSET, SUNRISE, 90, "Go"), 10);
  check("23:50, clear, long after dark",   launchChance(23 * 60 + 50, SUNSET, SUNRISE, 0, "Go"), 13);
  check("noon",                            launchChance(12 * 60,      SUNSET, SUNRISE, 0, "Go"), 2);
  puts("");
  puts("the floor at 5% decides what reaches the panel");
  const char *names[] = {"noon", "tonight 18:29", "19:49 clear"};
  int mins[] = {12 * 60, 18 * 60 + 29, 19 * 60 + 49};
  for (int i = 0; i < 3; i++) {
    int c = launchChance(mins[i], SUNSET, SUNRISE, 0, "Go");
    printf("  %-38s %3d%%  %s\n", names[i], c, c >= 5 ? "band" : "quote");
  }
  printf("\n%s\n", fails ? "FAILED" : "all rows match");
  return fails ? 1 : 0;
}
