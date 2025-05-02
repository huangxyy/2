<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Challenge details -->
    <button
      data-testid="start-challenge-btn"
      class="btn-primary"
      @click="startChallenge"
      :disabled="isRunning"
    >
      {{ isRunning ? '挑战进行中' : '开始挑战' }}
    </button>

    <!-- Terminal -->
    <Terminal
      v-if="isRunning"
      data-testid="terminal"
      :challenge-id="challengeId"
    />

    <!-- Flag submission -->
    <div class="mt-6">
      <input
        data-testid="flag-input"
        v-model="flag"
        type="text"
        placeholder="输入 flag"
        class="input-primary"
      />
      <button
        data-testid="submit-flag-btn"
        class="btn-primary ml-2"
        @click="submitFlag"
      >
        提交
      </button>
    </div>

    <!-- Submission result -->
    <div
      v-if="submissionResult"
      data-testid="submission-result"
      :class="{
        'text-green-600': submissionResult.correct,
        'text-red-600': !submissionResult.correct
      }"
      class="mt-4"
    >
      {{ submissionResult.correct ? '恭喜！回答正确' : '抱歉，答案错误' }}
      <span v-if="submissionResult.correct">
        获得 {{ submissionResult.points }} 分
      </span>
    </div>
  </div>
</template>