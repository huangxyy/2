import { mount } from '@vue/test-utils';
import ChallengeCard from '@/components/challenges/ChallengeCard.vue';

describe('ChallengeCard.vue', () => {
  const mockChallenge = {
    id: 1,
    title: 'Test Challenge',
    description: 'Test Description',
    difficulty_level: 2,
    points: 100,
    author: {
      username: 'testuser',
      avatar: 'test.jpg',
    },
  };

  it('renders challenge information correctly', () => {
    const wrapper = mount(ChallengeCard, {
      props: {
        challenge: mockChallenge,
      },
    });

    expect(wrapper.text()).toContain('Test Challenge');
    expect(wrapper.text()).toContain('Test Description');
    expect(wrapper.text()).toContain('100');
    expect(wrapper.text()).toContain('testuser');
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(ChallengeCard, {
      props: {
        challenge: mockChallenge,
      },
    });

    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('displays correct difficulty label and class', () => {
    const wrapper = mount(ChallengeCard, {
      props: {
        challenge: mockChallenge,
      },
    });

    const difficultyElement = wrapper.find('.bg-yellow-100');
    expect(difficultyElement.exists()).toBe(true);
    expect(difficultyElement.text()).toBe('中等');
  });
});